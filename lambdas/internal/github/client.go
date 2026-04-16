// Package github provides a thin wrapper around the GitHub Contents and Git Data APIs.
package github

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	ssmtypes "github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

const apiBase = "https://api.github.com"

var (
	tokenOnce sync.Once
	cachedPAT string
)

func getToken(ctx context.Context) (string, error) {
	var initErr error
	tokenOnce.Do(func() {
		paramName := os.Getenv("GITHUB_PAT_PARAM")
		if paramName == "" {
			paramName = "/fcg/admin/github-pat"
		}
		cfg, err := config.LoadDefaultConfig(ctx)
		if err != nil {
			initErr = err
			return
		}
		client := ssm.NewFromConfig(cfg)
		withDecryption := true
		out, err := client.GetParameter(ctx, &ssm.GetParameterInput{
			Name:           &paramName,
			WithDecryption: &withDecryption,
		})
		if err != nil {
			initErr = err
			return
		}
		cachedPAT = *out.Parameter.Value
	})
	return cachedPAT, initErr
}

func owner() string {
	if v := os.Getenv("GITHUB_OWNER"); v != "" {
		return v
	}
	return "fcgreviews"
}

func repo() string {
	if v := os.Getenv("GITHUB_REPO"); v != "" {
		return v
	}
	return "guild"
}

// do executes a GitHub API request and unmarshals the JSON response into out.
// Pass out=nil for responses with no body (e.g. 204).
func do(ctx context.Context, method, path string, body any, out any) error {
	token, err := getToken(ctx)
	if err != nil {
		return fmt.Errorf("getToken: %w", err)
	}

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, apiBase+path, reqBody)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 204 {
		return nil
	}
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API %s %s → %d: %s", method, path, resp.StatusCode, raw)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// ── Ref / SHA helpers ─────────────────────────────────────────────────────────

type refObject struct {
	Object struct {
		SHA string `json:"sha"`
	} `json:"object"`
}

// BranchSHA returns the HEAD commit SHA of a branch.
func BranchSHA(ctx context.Context, branch string) (string, error) {
	var ref refObject
	err := do(ctx, "GET",
		fmt.Sprintf("/repos/%s/%s/git/ref/heads/%s", owner(), repo(), branch),
		nil, &ref)
	return ref.Object.SHA, err
}

type commitInfo struct {
	Tree struct {
		SHA string `json:"sha"`
	} `json:"tree"`
}

// TreeSHA returns the tree SHA for a given commit SHA.
func TreeSHA(ctx context.Context, commitSHA string) (string, error) {
	var c commitInfo
	err := do(ctx, "GET",
		fmt.Sprintf("/repos/%s/%s/git/commits/%s", owner(), repo(), commitSHA),
		nil, &c)
	return c.Tree.SHA, err
}

// UpsertBranch creates a branch if it doesn't exist, or force-resets it to commitSHA.
func UpsertBranch(ctx context.Context, branch, commitSHA string) error {
	type createBody struct {
		Ref string `json:"ref"`
		SHA string `json:"sha"`
	}
	err := do(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/refs", owner(), repo()),
		createBody{Ref: "refs/heads/" + branch, SHA: commitSHA},
		nil)
	if err != nil {
		// Already exists — force-update
		type patchBody struct {
			SHA   string `json:"sha"`
			Force bool   `json:"force"`
		}
		return do(ctx, "PATCH",
			fmt.Sprintf("/repos/%s/%s/git/refs/heads/%s", owner(), repo(), branch),
			patchBody{SHA: commitSHA, Force: true},
			nil)
	}
	return nil
}

// ── File helpers ──────────────────────────────────────────────────────────────

type contentResponse struct {
	SHA     string `json:"sha"`
	Content string `json:"content"` // base64-encoded
}

// FileSHA returns the blob SHA of a file in the given branch, or "" if not found.
func FileSHA(ctx context.Context, path, branch string) (string, error) {
	var c contentResponse
	err := do(ctx, "GET",
		fmt.Sprintf("/repos/%s/%s/contents/%s?ref=%s", owner(), repo(), path, branch),
		nil, &c)
	if err != nil {
		return "", nil // treat missing file as empty SHA
	}
	return c.SHA, nil
}

// FileContent fetches and base64-decodes a file from the repo.
func FileContent(ctx context.Context, path, branch string) ([]byte, error) {
	var c contentResponse
	if err := do(ctx, "GET",
		fmt.Sprintf("/repos/%s/%s/contents/%s?ref=%s", owner(), repo(), path, branch),
		nil, &c); err != nil {
		return nil, err
	}
	// GitHub returns content with newlines — strip them before decoding
	clean := ""
	for _, ch := range c.Content {
		if ch != '\n' {
			clean += string(ch)
		}
	}
	return base64.StdEncoding.DecodeString(clean)
}

// ── Atomic multi-file commit (Git Tree API) ───────────────────────────────────

// File represents a single file to include in a commit.
// Set Content for text files, Binary for binary files (images etc.).
// Only one should be non-zero; Binary takes precedence.
type File struct {
	Path    string
	Content string // text content
	Binary  []byte // binary content — committed via a blob object
}

type treeEntry struct {
	Path    string `json:"path"`
	Mode    string `json:"mode"`
	Type    string `json:"type"`
	Content string `json:"content,omitempty"` // text files
	SHA     string `json:"sha,omitempty"`     // binary files (blob SHA)
}

// ── Blob creation (for binary files) ─────────────────────────────────────────

type createBlobBody struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
}

type blobResponse struct {
	SHA string `json:"sha"`
}

// createBlob uploads binary data to GitHub and returns its blob SHA.
func createBlob(ctx context.Context, data []byte) (string, error) {
	var resp blobResponse
	err := do(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/blobs", owner(), repo()),
		createBlobBody{
			Content:  base64.StdEncoding.EncodeToString(data),
			Encoding: "base64",
		},
		&resp)
	return resp.SHA, err
}

type createTreeBody struct {
	BaseTree string      `json:"base_tree"`
	Tree     []treeEntry `json:"tree"`
}

type treeResponse struct {
	SHA string `json:"sha"`
}

type createCommitBody struct {
	Message string   `json:"message"`
	Tree    string   `json:"tree"`
	Parents []string `json:"parents"`
}

type commitResponse struct {
	SHA string `json:"sha"`
}

type updateRefBody struct {
	SHA   string `json:"sha"`
	Force bool   `json:"force"`
}

// CommitFiles commits multiple files to a branch in a single atomic commit.
func CommitFiles(ctx context.Context, branch, message string, files []File) (string, error) {
	// 1. Get HEAD commit + tree SHAs
	headSHA, err := BranchSHA(ctx, branch)
	if err != nil {
		return "", fmt.Errorf("BranchSHA: %w", err)
	}
	treeSHA, err := TreeSHA(ctx, headSHA)
	if err != nil {
		return "", fmt.Errorf("TreeSHA: %w", err)
	}

	// 2. Build tree entries — binary files need a blob object created first
	entries := make([]treeEntry, len(files))
	for i, f := range files {
		if len(f.Binary) > 0 {
			sha, err := createBlob(ctx, f.Binary)
			if err != nil {
				return "", fmt.Errorf("create blob %s: %w", f.Path, err)
			}
			entries[i] = treeEntry{
				Path: f.Path,
				Mode: "100644",
				Type: "blob",
				SHA:  sha,
			}
		} else {
			entries[i] = treeEntry{
				Path:    f.Path,
				Mode:    "100644",
				Type:    "blob",
				Content: f.Content,
			}
		}
	}

	var newTree treeResponse
	if err := do(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/trees", owner(), repo()),
		createTreeBody{BaseTree: treeSHA, Tree: entries},
		&newTree); err != nil {
		return "", fmt.Errorf("create tree: %w", err)
	}

	// 3. Create commit
	var newCommit commitResponse
	if err := do(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/commits", owner(), repo()),
		createCommitBody{
			Message: message,
			Tree:    newTree.SHA,
			Parents: []string{headSHA},
		},
		&newCommit); err != nil {
		return "", fmt.Errorf("create commit: %w", err)
	}

	// 4. Advance branch pointer
	if err := do(ctx, "PATCH",
		fmt.Sprintf("/repos/%s/%s/git/refs/heads/%s", owner(), repo(), branch),
		updateRefBody{SHA: newCommit.SHA, Force: true},
		nil); err != nil {
		return "", fmt.Errorf("update ref: %w", err)
	}

	return newCommit.SHA, nil
}

// RepoPaths returns all file paths in the repo tree (for sequence numbering).
func RepoPaths(ctx context.Context, branch string) ([]string, error) {
	headSHA, err := BranchSHA(ctx, branch)
	if err != nil {
		return nil, err
	}
	treeSHA, err := TreeSHA(ctx, headSHA)
	if err != nil {
		return nil, err
	}

	type treeItem struct {
		Path string `json:"path"`
	}
	type treeResp struct {
		Tree []treeItem `json:"tree"`
	}

	var t treeResp
	if err := do(ctx, "GET",
		fmt.Sprintf("/repos/%s/%s/git/trees/%s?recursive=1", owner(), repo(), treeSHA),
		nil, &t); err != nil {
		return nil, err
	}

	paths := make([]string, len(t.Tree))
	for i, item := range t.Tree {
		paths[i] = item.Path
	}
	return paths, nil
}

// MergeBranch merges head into base.
func MergeBranch(ctx context.Context, head, base, message string) error {
	type mergeBody struct {
		Base          string `json:"base"`
		Head          string `json:"head"`
		CommitMessage string `json:"commit_message"`
	}
	return do(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/merges", owner(), repo()),
		mergeBody{Base: base, Head: head, CommitMessage: message},
		nil)
}

// SSMGetParameter is a convenience wrapper exposed for use outside this package.
func SSMGetParameter(ctx context.Context, name string) (string, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return "", err
	}
	client := ssm.NewFromConfig(cfg)
	withDecryption := true
	out, err := client.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           &name,
		WithDecryption: &withDecryption,
	})
	if err != nil {
		// Surface a cleaner error if param not found
		var nfe *ssmtypes.ParameterNotFound
		if ok := false; !ok {
			_ = nfe
		}
		return "", fmt.Errorf("SSM GetParameter %s: %w", name, err)
	}
	return *out.Parameter.Value, nil
}
