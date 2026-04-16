// Package auth provides JWT verification and HTTP response helpers for Lambda.
package auth

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

// CORSHeaders returns the standard CORS headers for all Lambda responses.
func CORSHeaders() map[string]string {
	origin := os.Getenv("ADMIN_ORIGIN")
	if origin == "" {
		origin = "https://admin.fcgreviews.com"
	}
	return map[string]string{
		"Access-Control-Allow-Origin":  origin,
		"Access-Control-Allow-Headers": "Content-Type,Authorization",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Content-Type":                 "application/json",
	}
}

// Response is a minimal API Gateway proxy response.
type Response struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

// OK returns a 200 response with the given value JSON-encoded.
func OK(v any) (Response, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return Err(500, "failed to encode response"), nil
	}
	return Response{StatusCode: 200, Headers: CORSHeaders(), Body: string(b)}, nil
}

// Err returns an error response.
func Err(code int, msg string) Response {
	b, _ := json.Marshal(map[string]string{"error": msg})
	return Response{StatusCode: code, Headers: CORSHeaders(), Body: string(b)}
}

// Preflight returns a 204 CORS preflight response.
func Preflight() Response {
	return Response{StatusCode: 204, Headers: CORSHeaders(), Body: ""}
}

// jwtPayload holds the fields we care about from a Cognito JWT.
type jwtPayload struct {
	Sub string `json:"sub"`
	Exp int64  `json:"exp"`
	Iss string `json:"iss"`
}

// VerifyToken validates the Bearer token in an Authorization header.
// It checks expiry and returns the subject (Cognito user ID).
//
// NOTE: This performs structural + expiry validation only.
// For full signature verification, integrate github.com/lestrrat-go/jwx
// or the AWS JWT Verify library. Suitable for an internal admin tool where
// the token is already validated by API Gateway (Cognito authorizer).
func VerifyToken(authHeader string) (string, error) {
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", errors.New("missing or invalid Authorization header")
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("malformed JWT")
	}

	// Decode payload (second segment, base64url-encoded)
	padded := parts[1]
	switch len(padded) % 4 {
	case 2:
		padded += "=="
	case 3:
		padded += "="
	}
	raw, err := base64.URLEncoding.DecodeString(padded)
	if err != nil {
		return "", fmt.Errorf("failed to decode JWT payload: %w", err)
	}

	var p jwtPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return "", fmt.Errorf("failed to parse JWT payload: %w", err)
	}

	if p.Exp > 0 && time.Now().Unix() > p.Exp {
		return "", errors.New("token expired")
	}

	return p.Sub, nil
}
