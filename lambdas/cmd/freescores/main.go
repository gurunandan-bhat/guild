// Lambda: GET /freescores, POST /freescores
//
// GET  — returns the contents of data/freescores.json from the main branch.
// POST — commits an updated data/freescores.json to the preview branch.
package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"

	"fcg/admin/lambdas/internal/auth"
	"fcg/admin/lambdas/internal/github"
)

const freescoresPath = "data/freescores.json"

type APIGatewayRequest struct {
	HTTPMethod string            `json:"httpMethod"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

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

	switch req.HTTPMethod {
	case "GET":
		return handleGet(ctx)
	case "POST":
		return handlePost(ctx, req.Body)
	default:
		return auth.Err(405, "method not allowed"), nil
	}
}

func handleGet(ctx context.Context) (auth.Response, error) {
	raw, err := github.FileContent(ctx, freescoresPath, "main")
	if err != nil {
		return auth.Err(500, fmt.Sprintf("read freescores: %s", err)), nil
	}

	// Decode to any so we return valid JSON (not a double-encoded string).
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return auth.Err(500, "freescores.json is not valid JSON"), nil
	}
	return auth.OK(v)
}

type postBody struct {
	Scores json.RawMessage `json:"scores"`
	Branch string          `json:"branch"`
}

func handlePost(ctx context.Context, rawBody string) (auth.Response, error) {
	if rawBody == "" {
		return auth.Err(400, "request body is required"), nil
	}

	var b postBody
	if err := json.Unmarshal([]byte(rawBody), &b); err != nil {
		return auth.Err(400, "invalid JSON body"), nil
	}
	if len(b.Scores) == 0 {
		return auth.Err(400, "scores is required"), nil
	}
	if b.Branch != "preview" && b.Branch != "main" {
		return auth.Err(400, `branch must be "preview" or "main"`), nil
	}

	// Validate scores is well-formed JSON and re-marshal with consistent formatting.
	var v any
	if err := json.Unmarshal(b.Scores, &v); err != nil {
		return auth.Err(400, "scores must be valid JSON"), nil
	}
	canonical, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return auth.Err(500, "failed to re-encode JSON"), nil
	}

	files := []github.File{
		{Path: freescoresPath, Content: string(canonical) + "\n"},
	}

	commitSHA, err := github.CommitFiles(ctx, b.Branch, "Update freescores", files)
	if err != nil {
		return auth.Err(500, fmt.Sprintf("commit: %s", err)), nil
	}

	return auth.OK(map[string]any{
		"committed": freescoresPath,
		"branch":    b.Branch,
		"sha":       commitSHA,
	})
}

func main() {
	lambda.Start(handler)
}
