# FCG Admin — Lambda Functions

Each subdirectory under `cmd/` is a standalone AWS Lambda handler.
All five functions are wired to a single HTTP API Gateway via the SAM template
(`template.yaml` in this directory).

## Functions

| Directory | Method | Path | Description |
|-----------|--------|------|-------------|
| `cmd/commit` | POST | `/commit` | Atomic multi-file commit to `preview` or `main` branch |
| `cmd/build-status` | GET | `/build-status` | Poll Amplify for latest preview branch build status |
| `cmd/meta-check` | POST | `/meta/check` | Return cached TMDB metadata or fetch + cache from TMDB |
| `cmd/freescores` | GET/POST | `/freescores` | Read or update `data/freescores.json` |
| `cmd/merge` | POST | `/merge` | Merge `preview` branch into `main` |

---

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Go 1.21+
- Docker (required for `sam local start-api` — not needed for `sam deploy`)
- AWS CLI configured with credentials that have permission to deploy CloudFormation stacks

> **Linux note:** `go build` on Linux/amd64 produces the correct Lambda binary directly.
> No cross-compilation flags (`GOOS`, `GOARCH`, `CGO_ENABLED`) are needed.
> `sam build` handles this automatically regardless of host OS.

---

## Local Development

`sam local start-api` runs all five Lambda functions in local Docker containers
and exposes them as a real HTTP server on `http://localhost:3001`.  The Vue SPA
`npm run dev` can then call this local API instead of the deployed one.

### 1. Create env.json

Copy the example and fill in real values:

```bash
cp env.json.example env.json
```

Edit `env.json`:
- `GITHUB_PAT_PARAM` — the SSM parameter name that holds your GitHub PAT.
  The local containers will call the real AWS SSM API, so your local AWS
  credentials must have `ssm:GetParameter` permission on that path.
- `AMPLIFY_APP_ID` — your Amplify app ID (find it in the Amplify console).
- `TMDB_API_KEY` — paste the key directly here for local runs (avoids an
  extra SSM call).
- `ADMIN_ORIGIN` — set to `http://localhost:5173` so CORS headers match the
  Vite dev server.

`env.json` is git-ignored and will never be committed.

### 2. Build

```bash
cd lambdas
sam build
```

SAM cross-compiles each Go binary for Linux/amd64 automatically and places
the results under `.aws-sam/build/`.

### 3. Start the local API

```bash
sam local start-api
```

The API is now running at `http://localhost:3001`.  All five routes are available:

```
POST http://localhost:3001/commit
GET  http://localhost:3001/build-status
POST http://localhost:3001/meta/check
GET  http://localhost:3001/freescores
POST http://localhost:3001/freescores
POST http://localhost:3001/merge
```

### 4. Point the SPA at the local API

In `admin/.env.local` set:

```
VITE_API_BASE_URL=http://localhost:3001
```

Then run `npm run dev` in the `admin/` directory as normal.

### Invoke a single function without starting the full server

Useful for quick smoke-tests:

```bash
echo '{"httpMethod":"GET","headers":{}}' | \
  sam local invoke BuildStatusFunction --env-vars env.json
```

---

## Deployment

### First deploy (interactive — sets up the S3 bucket and fills samconfig.toml)

```bash
cd lambdas
sam build
sam deploy --guided
```

You will be prompted for the parameters listed in `samconfig.toml`.
Fill in `AmplifyAppId` at minimum — everything else has sensible defaults.
SAM saves your answers to `samconfig.toml` so subsequent deploys are non-interactive.

### Subsequent deploys

```bash
sam build && sam deploy
```

SAM shows a changeset diff and asks for confirmation before applying
(controlled by `confirm_changeset = true` in `samconfig.toml`).

### What gets created in AWS

- **HTTP API Gateway** — one API with all five routes, CORS pre-configured
- **Five Lambda functions** — `provided.al2023` runtime, 128 MB, 30 s timeout
- **IAM role** — `fcg-admin-lambda-role` with CloudWatch Logs + SSM read + Amplify ListJobs
- **Stack outputs** — `ApiEndpoint` printed after deploy; copy it into `VITE_API_BASE_URL`

---

## SSM Parameters to Create (one-time setup)

```bash
aws ssm put-parameter --name /fcg/admin/github-pat \
  --value "ghp_xxxx" --type SecureString

aws ssm put-parameter --name /fcg/admin/tmdb-api-key \
  --value "xxxx" --type SecureString
```

---

## Environment Variables Reference

| Variable | Functions | Description |
|----------|-----------|-------------|
| `GITHUB_OWNER` | all | GitHub repo owner (default: `fcgreviews`) |
| `GITHUB_REPO` | all | GitHub repo name (default: `guild`) |
| `GITHUB_PAT_PARAM` | all | SSM path for the GitHub bot PAT |
| `ADMIN_ORIGIN` | all | Allowed CORS origin |
| `AMPLIFY_APP_ID` | build-status | Amplify App ID |
| `AMPLIFY_PREVIEW_URL` | build-status | Preview site URL |
| `TMDB_API_KEY` | meta-check | TMDB API key (or blank to read from SSM) |

---

## Tearing Down

```bash
sam delete
```

Deletes the CloudFormation stack and all resources it created.
The SSM parameters are **not** deleted — remove those manually if needed.
