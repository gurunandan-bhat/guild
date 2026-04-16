// Lambda: POST /merge
//
// Merges the preview branch into main, triggering a live-site rebuild.
package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"

	"fcg/admin/lambdas/internal/auth"
	"fcg/admin/lambdas/internal/github"
)

type APIGatewayRequest struct {
	HTTPMethod string            `json:"httpMethod"`
	Headers    map[string]string `json:"headers"`
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

	if err := github.MergeBranch(ctx, "preview", "main", "Merge preview into main"); err != nil {
		return auth.Err(500, fmt.Sprintf("merge: %s", err)), nil
	}

	return auth.OK(map[string]any{"merged": true})
}

func main() {
	lambda.Start(handler)
}
