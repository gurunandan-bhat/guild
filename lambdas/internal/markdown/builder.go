// Package markdown builds Hugo review markdown files from form data.
package markdown

import (
	"crypto/md5"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var nonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

// TitleToSlug converts a film title to a kebab-case URL slug.
// e.g. "The Bear S04" → "the-bear-s04"
func TitleToSlug(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = nonAlnum.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// ReviewPath returns the content/reviews/ path for a new review file.
func ReviewPath(filmTitle string, seqN int) string {
	return fmt.Sprintf("content/reviews/%s-%d.md", TitleToSlug(filmTitle), seqN)
}

// MD5Hex returns the lowercase hex MD5 of a string (used for TMDB cache keys).
func MD5Hex(s string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(s)))
}

// FormData mirrors the review form fields sent from the SPA.
type FormData struct {
	Media        string `json:"media"`
	ShowType     string `json:"showType"`     // "movie" | "tv"
	CriticName   string `json:"criticName"`
	FilmTitle    string `json:"filmTitle"`
	TmdbID       int64  `json:"tmdbId"`
	Subtitle     string `json:"subtitle"`
	Opening      string `json:"opening"`
	Publication  string `json:"publication"`
	Score        int    `json:"score"`
	Body         string `json:"body"`
	AudioPath    string `json:"audioPath"`
	AudioCaption string `json:"audioCaption"`
	YoutubeID    string `json:"youtubeId"`
	SpotifyID    string `json:"spotifyId"`
	Source       string `json:"source"`
	Img          string `json:"img"`
}

// tomlStr escapes a string for use as a TOML double-quoted value.
func tomlStr(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return `"` + s + `"`
}

// tomlStrArray renders a []string as a TOML array.
func tomlStrArray(ss []string) string {
	quoted := make([]string, len(ss))
	for i, s := range ss {
		quoted[i] = tomlStr(s)
	}
	return "[" + strings.Join(quoted, ", ") + "]"
}

// buildBody returns the markdown body section based on media type.
func buildBody(f FormData) string {
	switch f.Media {
	case "audio":
		return fmt.Sprintf("{{< audio path=%q caption=%q >}}\n", f.AudioPath, f.AudioCaption)
	case "video":
		return fmt.Sprintf("{{< youtube id=%q loading=\"lazy\" >}}\n", f.YoutubeID)
	case "spotify":
		return fmt.Sprintf("{{< spotify id=%q height=\"250\" >}}\n", f.SpotifyID)
	default:
		return strings.TrimRight(f.Body, "\n") + "\n"
	}
}

// BuildReviewMarkdown generates the complete .md file content for a review.
func BuildReviewMarkdown(f FormData, date time.Time) string {
	if date.IsZero() {
		date = time.Now()
	}
	dateStr := date.Format(time.RFC3339)

	scores := "[]"
	if f.Score > 0 {
		scores = fmt.Sprintf("[%d]", f.Score)
	}

	showType := f.ShowType
	if showType == "" {
		showType = "movie"
	}

	lines := []string{
		"+++",
		fmt.Sprintf("critics = %s", tomlStrArray([]string{f.CriticName})),
		fmt.Sprintf("date = %s", dateStr),
		"draft = false",
		fmt.Sprintf("img = %s", tomlStr(f.Img)),
		fmt.Sprintf("media = %s", tomlStr(f.Media)),
		fmt.Sprintf("mreviews = %s", tomlStrArray([]string{f.FilmTitle})),
		fmt.Sprintf("opening = %s", tomlStr(f.Opening)),
		fmt.Sprintf("publication = %s", tomlStr(f.Publication)),
		fmt.Sprintf("scores = %s", scores),
		fmt.Sprintf("show_type = %s", tomlStr(showType)),
		fmt.Sprintf("source = %s", tomlStr(f.Source)),
		fmt.Sprintf("subtitle = %s", tomlStr(f.Subtitle)),
		fmt.Sprintf("title = %s", tomlStr(f.FilmTitle)),
		"+++",
		"",
		buildBody(f),
	}

	return strings.Join(lines, "\n")
}
