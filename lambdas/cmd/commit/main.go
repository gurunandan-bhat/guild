// Lambda: POST /commit
//
// Atomically commits all staged reviews to a target branch using the
// GitHub Git Tree API — one commit, one Amplify build trigger.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"

	"fcg/admin/lambdas/internal/auth"
	"fcg/admin/lambdas/internal/github"
	"fcg/admin/lambdas/internal/markdown"
)

// ── Request / response types ──────────────────────────────────────────────────

type StagedReview struct {
	FormData     markdown.FormData `json:"formData"`
	IsEdit       bool              `json:"isEdit"`
	ExistingSlug string            `json:"existingSlug"`
}

type RequestBody struct {
	Reviews []StagedReview `json:"reviews"`
	Branch  string         `json:"branch"`
}

type APIGatewayRequest struct {
	HTTPMethod string            `json:"httpMethod"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

// ── Handler ───────────────────────────────────────────────────────────────────

func handler(ctx context.Context, req APIGatewayRequest) (auth.Response, error) {
	if req.HTTPMethod == "OPTIONS" {
		return auth.Preflight(), nil
	}

	authHeader := req.Headers["Authorization"]
	if authHeader == "" {
		authHeader = req.Headers["authorization"]
	}
	if _, err := auth.VerifyToken(authHeader); err != nil {
		return auth.Err(401, err.Error()), nil
	}

	var body RequestBody
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		return auth.Err(400, "invalid JSON body"), nil
	}
	if len(body.Reviews) == 0 {
		return auth.Err(400, "reviews array must not be empty"), nil
	}
	if body.Branch != "preview" && body.Branch != "main" {
		return auth.Err(400, `branch must be "preview" or "main"`), nil
	}

	// If targeting preview, reset it to current main HEAD first.
	if body.Branch == "preview" {
		mainSHA, err := github.BranchSHA(ctx, "main")
		if err != nil {
			return auth.Err(500, fmt.Sprintf("get main SHA: %s", err)), nil
		}
		if err := github.UpsertBranch(ctx, "preview", mainSHA); err != nil {
			return auth.Err(500, fmt.Sprintf("reset preview branch: %s", err)), nil
		}
	}

	// Fetch repo paths for sequence number calculation.
	repoPaths, err := github.RepoPaths(ctx, body.Branch)
	if err != nil {
		return auth.Err(500, fmt.Sprintf("fetch repo paths: %s", err)), nil
	}

	// Build files to commit.
	var files []github.File
	var filmTitles []string

	for _, review := range body.Reviews {
		fd := review.FormData
		var filePath string

		if review.IsEdit && review.ExistingSlug != "" {
			slug := review.ExistingSlug
			if !strings.HasPrefix(slug, "content/") {
				slug = "content/reviews/" + strings.TrimPrefix(slug, "/") + ".md"
			}
			filePath = slug
		} else {
			seqN := nextSeqNumber(markdown.TitleToSlug(fd.FilmTitle), repoPaths)
			filePath = markdown.ReviewPath(fd.FilmTitle, seqN)
		}

		files = append(files, github.File{
			Path:    filePath,
			Content: markdown.BuildReviewMarkdown(fd, time.Time{}),
		})
		filmTitles = append(filmTitles, fd.FilmTitle)
	}

	// Deduplicate film titles for the commit message.
	seen := map[string]bool{}
	var uniqueTitles []string
	for _, t := range filmTitles {
		if !seen[t] {
			seen[t] = true
			uniqueTitles = append(uniqueTitles, t)
		}
	}
	msg := fmt.Sprintf("Add %d review(s): %s", len(body.Reviews), strings.Join(uniqueTitles, ", "))

	commitSHA, err := github.CommitFiles(ctx, body.Branch, msg, files)
	if err != nil {
		return auth.Err(500, fmt.Sprintf("commit: %s", err)), nil
	}

	committed := make([]string, len(files))
	for i, f := range files {
		committed[i] = f.Path
	}

	return auth.OK(map[string]any{
		"committed": committed,
		"branch":    body.Branch,
		"sha":       commitSHA,
		"message":   msg,
	})
}

// nextSeqNumber finds the next available N for content/reviews/{slug}-N.md
func nextSeqNumber(slug string, paths []string) int {
	prefix := fmt.Sprintf("content/reviews/%s-", slug)
	max := 0
	for _, p := range paths {
		if strings.HasPrefix(p, prefix) && strings.HasSuffix(p, ".md") {
			numStr := strings.TrimSuffix(strings.TrimPrefix(p, prefix), ".md")
			n := 0
			fmt.Sscanf(numStr, "%d", &n)
			if n > max {
				max = n
			}
		}
	}
	return max + 1
}

func main() {
	lambda.Start(handler)
}
