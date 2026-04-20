// Lambda: POST /meta/check
//
// Checks whether TMDB metadata for a film is already cached by hitting the live
// site's /mreviews/{slug}/index.json endpoint and extracting the Metadata field.
// If not cached, fetches from TMDB, downloads poster + backdrop images, and
// commits all three files atomically to main so Hugo has everything it needs.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"

	"fcg/admin/lambdas/internal/auth"
	"fcg/admin/lambdas/internal/github"
	"fcg/admin/lambdas/internal/markdown"
)

const (
	tmdbAPIBase     = "https://api.themoviedb.org/3"
	tmdbPosterBase  = "https://image.tmdb.org/t/p/w500"
	tmdbBackdropBase = "https://image.tmdb.org/t/p/w1280"
)

type APIGatewayRequest struct {
	HTTPMethod string            `json:"httpMethod"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

type RequestBody struct {
	TmdbID    int64  `json:"tmdbId"`
	FilmTitle string `json:"filmTitle"`
	ShowType  string `json:"showType"` // "movie" | "tv" — defaults to "movie"
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

	var body RequestBody
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		return auth.Err(400, "invalid JSON body"), nil
	}
	if body.TmdbID == 0 {
		return auth.Err(400, "tmdbId is required"), nil
	}
	if body.FilmTitle == "" {
		return auth.Err(400, "filmTitle is required"), nil
	}
	if body.ShowType == "" {
		body.ShowType = "movie"
	}

	jsonPath := fmt.Sprintf("assets/meta/%s.json", markdown.MD5Hex(body.FilmTitle))

	// Check live site cache first — cheaper than the GitHub Contents API.
	if cached, err := fetchCachedMeta(ctx, body.FilmTitle); err == nil && cached != nil {
		return auth.OK(cached)
	}

	// Not cached — resolve API key.
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		var err error
		apiKey, err = github.SSMGetParameter(ctx, "/fcg/admin/tmdb-api-key")
		if err != nil {
			return auth.Err(500, fmt.Sprintf("get TMDB key: %s", err)), nil
		}
	}

	// Fetch metadata from TMDB.
	meta, err := fetchTMDBMeta(ctx, body.TmdbID, body.ShowType, body.FilmTitle, apiKey)
	if err != nil {
		return auth.Err(502, fmt.Sprintf("TMDB fetch: %s", err)), nil
	}

	// Build the list of files to commit: JSON + poster + backdrop.
	canonical, _ := json.MarshalIndent(meta, "", "  ")
	files := []github.File{
		{Path: jsonPath, Content: string(canonical) + "\n"},
	}

	// Poster image — stored at assets/meta/posters{poster_path}
	if posterPath, _ := meta["poster_path"].(string); posterPath != "" {
		if img, err := fetchImage(ctx, tmdbPosterBase+posterPath); err == nil {
			files = append(files, github.File{
				Path:   "assets/meta/posters" + posterPath,
				Binary: img,
			})
		}
	}

	// Backdrop image — stored at assets/meta/backdrops{backdrop_path}
	if backdropPath, _ := meta["backdrop_path"].(string); backdropPath != "" {
		if img, err := fetchImage(ctx, tmdbBackdropBase+backdropPath); err == nil {
			files = append(files, github.File{
				Path:   "assets/meta/backdrops" + backdropPath,
				Binary: img,
			})
		}
	}

	// Commit everything to main atomically — metadata is not review content
	// and does not need the preview/approval cycle.
	_, _ = github.CommitFiles(ctx, "main",
		fmt.Sprintf("Cache TMDB metadata + images: %s", body.FilmTitle), files)

	return auth.OK(meta)
}

// fetchCachedMeta hits the live site's /mreviews/{slug}/index.json and returns
// the Metadata field if present, or nil if the film is not yet cached.
func fetchCachedMeta(ctx context.Context, filmTitle string) (map[string]any, error) {
	siteBase := os.Getenv("SITE_BASE_URL")
	if siteBase == "" {
		siteBase = "https://www.fcgreviews.com"
	}
	url := fmt.Sprintf("%s/mreviews/%s/index.json", siteBase, markdown.TitleToSlug(filmTitle))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("site cache fetch %d", resp.StatusCode)
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Metadata map[string]any `json:"Metadata"`
	}
	if err := json.Unmarshal(raw, &wrapper); err != nil {
		return nil, err
	}
	return wrapper.Metadata, nil
}

// fetchTMDBMeta calls the TMDB movie or TV endpoint with credits appended
// and stamps fcg_title with the FCG canonical title.
func fetchTMDBMeta(ctx context.Context, id int64, showType, fcgTitle, apiKey string) (map[string]any, error) {
	url := fmt.Sprintf("%s/%s/%d?append_to_response=credits&api_key=%s",
		tmdbAPIBase, showType, id, apiKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("TMDB API %d: %s", resp.StatusCode, raw)
	}

	var v map[string]any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, fmt.Errorf("decode TMDB response: %w", err)
	}
	v["fcg_title"] = fcgTitle
	return v, nil
}

// fetchImage downloads an image from a URL and returns its bytes.
func fetchImage(ctx context.Context, url string) ([]byte, error) {
	// Validate the URL is a TMDB image URL before fetching.
	if !strings.HasPrefix(url, "https://image.tmdb.org/") {
		return nil, fmt.Errorf("unexpected image URL: %s", url)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("image fetch %s → %d", url, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

func main() {
	lambda.Start(handler)
}
