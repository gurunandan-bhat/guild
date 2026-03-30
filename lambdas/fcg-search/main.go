package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/algolia/algoliasearch-client-go/v4/algolia/search"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// --- Request / Response types ---

type SearchRequest struct {
	Token                  string `json:"token,omitempty"`
	Query                  string `json:"query,omitempty"`
	MinScore               int    `json:"minScore,omitempty"`
	Page                   int32  `json:"page,omitempty"`
	ValidateTurnstileToken bool   `json:"validateTurnstileToken,omitempty"`
}

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

type SearchResponse struct {
	Hits  []search.Hit `json:"hits,omitempty"`
	Pages int32        `json:"pages,omitempty"`
}

// --- Main handler ---

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	headers := map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  os.Getenv("ALLOWED_ORIGIN"),
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, x-api-key, X-Api-Key",
	}

	// Handle CORS preflight
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
		}, nil
	}

	// Parse request body
	var searchReq SearchRequest
	if err := json.Unmarshal([]byte(request.Body), &searchReq); err != nil {
		return errorResponse(400, "Invalid request body", headers), nil
	}

	if searchReq.Token == "" || searchReq.Query == "" {
		return errorResponse(400, "Missing token or query", headers), nil
	}

	if searchReq.ValidateTurnstileToken {
		// Validate Turnstile token
		if err := validateTurnstile(searchReq.Token); err != nil {
			return errorResponse(403, "Turnstile validation failed", headers), nil
		}
	}

	// Call Algolia
	searchResponse, err := searchAlgolia(searchReq)
	if err != nil {
		return errorResponse(502, "Search failed", headers), nil
	}

	// Marshal and return response
	responseBody, err := json.Marshal(searchResponse)
	if err != nil {
		return errorResponse(500, "Failed to marshal results", headers), nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(responseBody),
	}, nil
}

// --- Turnstile validation ---

func validateTurnstile(token string) error {

	secret := os.Getenv("TURNSTILE_SECRET_KEY")

	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
		url.Values{
			"secret":   {secret},
			"response": {token},
		},
	)
	if err != nil {
		return fmt.Errorf("turnstile request failed: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			fmt.Printf("error closing turnstile response: %v", err)
		}
	}()

	var tsResp TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&tsResp); err != nil {
		return fmt.Errorf("turnstile decode failed: %w", err)
	}

	if !tsResp.Success {
		return fmt.Errorf("turnstile invalid: %v", tsResp.ErrorCodes)
	}

	return nil
}

// --- Algolia search ---

func searchAlgolia(searchReq SearchRequest) (*SearchResponse, error) {

	appID := os.Getenv("ALGOLIA_APP_ID")
	apiKey := os.Getenv("ALGOLIA_API_KEY")
	index := os.Getenv("ALGOLIA_INDEX_NAME")

	client, err := search.NewClient(appID, apiKey)
	if err != nil {
		return nil, fmt.Errorf("error creating algolia client: %w", err)
	}

	numericFilter := search.StringAsNumericFilters(
		fmt.Sprintf("AverageScore >= %d", searchReq.MinScore),
	)

	srchForHits := search.NewEmptySearchForHits().
		SetIndexName(index).
		SetQuery(searchReq.Query).
		SetNumericFilters(numericFilter).
		SetPage(searchReq.Page)

	searchResp, err := client.SearchForHits(
		client.NewApiSearchRequest(
			search.NewEmptySearchMethodParams().SetRequests(
				[]search.SearchQuery{*search.SearchForHitsAsSearchQuery(srchForHits)},
			),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("error searching algolia: %w", err)
	}

	// SearchForHits returns one result per index request.
	// Since we only request one index we take the first result.
	if len(searchResp) == 0 {
		return &SearchResponse{Hits: []search.Hit{}, Pages: 0}, nil
	}

	resp := searchResp[0]
	return &SearchResponse{
		Hits:  resp.GetHits(),
		Pages: resp.GetNbPages(),
	}, nil
}

// --- Error helper ---

func errorResponse(code int, message string, headers map[string]string) events.APIGatewayProxyResponse {
	body, _ := json.Marshal(map[string]string{"error": message})
	return events.APIGatewayProxyResponse{
		StatusCode: code,
		Headers:    headers,
		Body:       string(body),
	}
}

func main() {
	lambda.Start(handler)
}
