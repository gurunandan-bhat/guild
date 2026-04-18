// Lambda: GET /build-status
//
// Polls the Amplify API for the latest build on the preview branch.
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/amplify"

	"fcg/admin/lambdas/internal/auth"
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

	appID := os.Getenv("AMPLIFY_APP_ID")
	if appID == "" {
		return auth.Err(500, "AMPLIFY_APP_ID not configured"), nil
	}

	previewURL := os.Getenv("AMPLIFY_PREVIEW_URL")
	if previewURL == "" {
		previewURL = "https://preview.fcgreviews.com"
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return auth.Err(500, fmt.Sprintf("AWS config: %s", err)), nil
	}

	client := amplify.NewFromConfig(cfg)
	branch := os.Getenv("PREVIEW_BRANCH")
	if branch == "" {
		branch = "preview"
	}

	out, err := client.ListJobs(ctx, &amplify.ListJobsInput{
		AppId:      &appID,
		BranchName: &branch,
		MaxResults: 1,
	})
	if err != nil {
		return auth.Err(500, fmt.Sprintf("ListJobs: %s", err)), nil
	}

	if len(out.JobSummaries) == 0 {
		return auth.OK(map[string]any{"status": "BUILDING", "url": nil})
	}

	job := out.JobSummaries[0]
	status := string(job.Status)

	// Normalise in-progress states to a single "BUILDING" value for the SPA.
	switch status {
	case "PENDING", "RUNNING", "CANCELLING":
		status = "BUILDING"
	}

	var url any
	if status == "SUCCEED" {
		url = previewURL
	}

	return auth.OK(map[string]any{"status": status, "url": url})
}

func main() {
	lambda.Start(handler)
}
