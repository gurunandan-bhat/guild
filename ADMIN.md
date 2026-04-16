# Admin UI for FCG Reviews (Hugo Site)

## Context

The Film Critics Guild site is a Hugo SSG with ~3300+ review markdown files deployed on AWS Amplify. Reviews are currently added manually by writing `.md` files with TOML front matter. The Admin UI will allow critics to add and edit reviews through a browser — no Git or local tooling required. All writes go through a Lambda layer that commits to GitHub, triggering Amplify builds.

---

## Architecture Overview

```
[Vue3 SPA — deployed on Amplify]
      ↓ reads                    ↓ writes
[Hugo JSON endpoints]     [API Gateway + Lambda]
  /mreviews/index.json          ↓
  /critics/index.json     [GitHub API → commit .md to branch]
                                ↓
                    [Amplify builds preview branch]
                                ↓
                    SPA polls build status (~1 min)
                    Shows spinner → opens preview in new tab
                         ↙           ↘
                   Approve          Fix edits
                      ↓                ↓
              Lambda merges      Re-submit → new
              preview → main     preview build
                      ↓
              Amplify builds main (live site)
```

---

## Authentication

- **AWS Cognito** user pool manages all identity — no custom login form is built
- On load, the SPA checks for a valid Cognito session; if absent it redirects to the **Cognito Hosted UI** (fully managed login page at e.g. `auth.fcgreviews.com`)
- On successful login Cognito redirects back to `https://admin.fcgreviews.com` with tokens; Amplify Auth stores the session automatically
- Every Lambda call carries the Cognito JWT in the `Authorization` header; Lambda verifies it before any GitHub operation
- Critic identity (Cognito username) is included in commit messages for audit trail
- User accounts are managed via the AWS Console (one operator account to start)

---

## Frontend — Vue3 SPA

**Deployment:** Separate Amplify app, served at `https://admin.fcgreviews.com`

The admin SPA is a distinct application from the Hugo site — its own directory (`admin/` in the repo root), its own `package.json` and Vite config, built and deployed independently by Amplify. This keeps a clean security boundary between the public site and the authenticated admin tool.

**Data sources (reads — all direct fetches to Hugo JSON, no Lambda involved):**
- Recent films list — `/mreviews/index.json` (sorted by date)
- Critic autocomplete — `/critics/index.json`
- Film title autocomplete — `/mreviews/index.json`
- Edit form pre-population — `/mreviews/{film-slug}/index.json` (`Reviews[].Params` for all front matter fields, `Reviews[].Content` for body, `Reviews[].ReviewPath` for the file slug)
- TMDB metadata — live from TMDB API via Lambda `POST /tmdb/fetch` (result cached to `assets/meta/`)

### State Management — Pinia

On app startup, the SPA fetches both index files once and loads them into Pinia stores. All autocomplete filtering is done in-memory against this data for the duration of the session — no per-keystroke network calls.

```
useFilmsStore
  films[]            ← flat sorted array transformed from /mreviews/index.json
                       (map keyed by MD5 → array of { title, slug, tmdbId, posterPath })
  filteredFilms      ← computed, reactive to search input
  addFilm()          ← optimistic local add after a successful commit

useCriticsStore
  critics[]          ← from /critics/index.json on startup
  filteredCritics    ← computed, reactive to search input

useStagingStore
  staged[]           ← reviews added this session, not yet committed
  addToStaging()     ← called when operator clicks "Stage" after filling the form
  removeFromStaging()← operator removes a review from the list
  clearStaging()     ← called after a successful Save
```

Pinia state is persisted to `localStorage` via `pinia-plugin-persistedstate` so staged reviews survive accidental tab closes.

### Session Staging

The operator may add multiple reviews in one sitting before committing. Each completed review is added to `useStagingStore` rather than immediately committed. The left panel shows both recent films (for quick selection) and the current staging list:

```
LEFT PANEL
─────────────────
Recent Films
[ film + poster ]   ← click to pre-fill form
[ film + poster ]
...
─────────────────
Staged (3)
[ The Bear S04   ]  ← click to re-edit
[ Sitaare Zameen ]
[ Housefull 5    ]  ← × to remove
─────────────────
[ Test ]  [ Save ]
```

- **Test** — commits all staged reviews to the preview branch in a single atomic GitHub commit (Git Tree API), triggers one Amplify build, polls for completion, opens preview URL in new tab
- **Save** — commits all staged reviews directly to main in a single atomic commit, triggers live rebuild, clears the staging store

**Single atomic commit for the batch (GitHub Git Tree API):**
```
GET  current tree SHA for branch
POST /git/trees    → new tree containing all staged .md files + images
POST /git/commits  → one commit referencing the new tree
PATCH /git/refs    → advance branch pointer
```

One commit message lists all films in the batch (e.g. `Add 3 reviews: The Bear S04, Sitaare Zameen, Housefull 5`).

---

## UI Screens

### Screen 1 — Create / Edit Review (Main Form)

Three-column layout:

**Left Section — Recent Films**
- List of ~10–15 most recently reviewed films (from `/mreviews/index.json`, sorted by date)
- Each item: film title, poster thumbnail, date of last review
- Click to pre-populate: film title + TMDB ID fields in the middle section

**Middle Section — Review Form**

*Row 0 — Type selector (topmost element, always visible):*
- Segmented control / radio group: **Print · Audio · Video · Spotify**
- Defaults to Print (the overwhelming majority of reviews)
- Selection drives which fields are shown below

*Row 1 (three fields, single line):*
- **Critic name** — combobox, incremental match across ~60 critics from `/critics/index.json`
- **Film title** — combobox, incremental match against existing films; accepts new titles
- **TMDB ID** — number input; auto-populated when an existing film is selected; manually entered for new films

*Row 2 (additional front matter fields — always visible):*
- **Subtitle** — text input
- **Opening quote** — text input (hidden for Video and Spotify)
- **Publication** — text input (Print only)
- **Score** — number input (integer, 1–10)

*Row 3 — Embed / body field (varies by type):*
- **Print** — textarea for review body (left) + image file picker (right)
- **Audio** — audio file path input + caption input (left) + image file picker (right)
- **Video** — YouTube ID input
- **Spotify** — Spotify episode ID input

*Row 4 (conditional):*
- **Source URL** — shown for Print and Video only

Field visibility by type:

| Field | Print | Audio | Video | Spotify |
|-------|:-----:|:-----:|:-----:|:-------:|
| Critic, film, TMDB ID | ✓ | ✓ | ✓ | ✓ |
| Subtitle, Score | ✓ | ✓ | ✓ | ✓ |
| Opening quote | ✓ | ✓ | — | — |
| Publication | ✓ | — | — | — |
| Image upload | ✓ | ✓ | — | — |
| Source URL | ✓ | — | ✓ | — |
| Review body (text) | ✓ | — | — | — |
| Audio path + caption | — | ✓ | — | — |
| YouTube ID | — | — | ✓ | — |
| Spotify ID | — | — | — | ✓ |

*Action buttons (below form):*
- **Preview** — renders the review as a modal (client-side, no network call); shows formatted review text, score, critic name, film title
- **Test** — commits to preview branch → polls `GET /build-status` with spinner → opens Amplify preview URL in new tab when build completes
- **Save** — commits directly to main branch → triggers live site rebuild

**Auto Create/Edit detection:**
- When both critic name and film title are filled, the SPA fetches `/mreviews/{film-slug}/index.json` (already generated by Hugo, no Lambda call needed)
- Scans the `Reviews` array for an entry matching the critic name
- If found → form fields populate directly from the JSON (`Params` contains all front matter fields; `Content` contains the raw review body; `ReviewPath` gives the file slug for the eventual write) → subtle "Editing existing review" indicator shown
- If no match → form stays in Create mode
- From this point the flow is identical; Save in Edit mode uses `ReviewPath` to overwrite the existing `.md` file via Lambda

**Right Section — Film Metadata Panel**
- Populated when TMDB ID is entered (live fetch via Lambda → TMDB API)
- Also saves result to `assets/meta/{md5(title)}.json` if the film is new
- Displays: poster, title, original title, release date, genres, language, overview, top cast, director, editor, writer, cinematographer

---

### Screen 2 — Review List

- Search/filter by film title or critic name
- Paginated list of all reviews (from `/mreviews/index.json`)
- Each row: film title, critic, date, score
- Click row → opens main form in Edit mode

---

### Screen 3 — Free Scores Editor

- Loads `data/freescores.json` via Lambda `GET /freescores`
- Editable table: film title → critic name → score
- Add film row / remove film row
- Add critic score / remove critic score within a film
- Test / Save buttons same as review form

---

## Backend — Lambda Endpoints (API Gateway)

All endpoints require a valid Cognito JWT in the `Authorization` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/commit` | Atomic commit of all staged `.md` files + images to preview branch (Git Tree API) |
| GET | `/build-status` | Poll Amplify API for preview branch build state |
| POST | `/merge` | Merge preview branch into main |
| POST | `/meta/check` | Check GitHub for cached `assets/meta/{md5}.json`; return it if found |
| POST | `/tmdb/fetch` | New films only — call TMDB API, commit metadata JSON to `assets/meta/` on preview branch |
| POST | `/upload` | Accept image; commit to `assets/images/reviews/` on preview branch |
| GET | `/freescores` | Return `data/freescores.json` contents |
| POST | `/freescores` | Commit updated `data/freescores.json` to preview branch |

---

## Preview / Merge Workflow

### Branch Strategy

**Single shared `preview` branch** — one person enters all reviews on behalf of critics, so parallel sessions are not a concern.

- One extra branch (`preview`) configured in Amplify
- Preview URL is fixed: `preview.fcgreviews.com`
- No session locking needed
- Simple branch lifecycle: reset to `main` on each Test, merged back to `main` on Save

### Workflow Steps

1. Operator fills form → clicks **Test** → `POST /commit` → Lambda commits `.md` to preview branch
2. Amplify detects branch push → starts build (Hugo, typically < 1 min)
3. SPA polls `GET /build-status` every 15–20 s → shows "Building preview…" spinner
4. Build complete → SPA opens preview URL in new tab
5. **Approve** → operator clicks **Save** → `POST /merge` → Lambda merges preview → main → live rebuild
6. **Fix** → operator corrects form → clicks **Test** again → Lambda force-pushes to preview branch → new build

---

## GitHub API Operations (inside Lambda)

All operations use a bot PAT stored in AWS SSM Parameter Store.

| Step | GitHub API call |
|------|----------------|
| Create/reset preview branch | `POST /repos/{owner}/{repo}/git/refs` or `PATCH` to force-reset |
| Get current tree SHA | `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` → commit → tree |
| Create new tree (batch of files) | `POST /repos/{owner}/{repo}/git/trees` |
| Create commit referencing new tree | `POST /repos/{owner}/{repo}/git/commits` |
| Advance branch to new commit | `PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}` |
| Merge preview → main | `POST /repos/{owner}/{repo}/merges` |

---

## Review Data Model

```
Front matter (TOML):
  title        string     — film title (same as mreviews[0])
  date         datetime   — auto-set to now on create
  draft        bool       — always false on save
  mreviews     []string   — film title(s); drives mreviews taxonomy
  critics      []string   — critic name(s); drives critics taxonomy
  publication  string
  subtitle     string
  opening      string     — opening quote
  img          string     — filename only, e.g. "the-bear-s04-2.webp"
  media        string     — "print" | "audio" | "video" | "spotify"
  source       string     — URL of published review
  scores       []int      — integer score(s), 1–10

Body: markdown review text (print), or Hugo shortcode for other types:
  audio:   {{< audio path="" caption="" >}}
  video:   {{< youtube id="" loading="lazy" >}}
  spotify: {{< spotify id="" height="250" >}}
```

**File naming:** `content/reviews/{film-slug}-{N}.md`
- `{film-slug}` = kebab-case of film title
- `{N}` = next integer after highest existing N for that slug

**Images:** uploaded to `assets/images/reviews/{film-slug}-{N}.{ext}`

**TMDB metadata:** stored at `assets/meta/{md5(film-title)}.json`

---

## TMDB Integration

`assets/meta/` is processed by Hugo at build time and is not publicly served. All reads from this directory go through the GitHub Contents API. The subfolders `assets/meta/posters/` and `assets/meta/backdrops/` contain locally downloaded images, but the right panel uses TMDB CDN URLs instead (constructed from `poster_path` / `backdrop_path` in the metadata JSON) to avoid fetching binary files through the GitHub API.

### Metadata lookup flow

1. Operator enters a film title
2. Lambda `POST /meta/check` computes `md5(title)` and calls GitHub Contents API to check for `assets/meta/{md5}.json`
3. **File exists (film reviewed before)** → Lambda returns the decoded JSON; right panel populates immediately; no TMDB call made
4. **File absent (new film)** → SPA prompts operator to enter TMDB ID → `POST /tmdb/fetch` → Lambda calls TMDB API, commits metadata JSON to preview branch, returns metadata to SPA

### Right panel image display

- Poster: `https://image.tmdb.org/t/p/w342{poster_path}` (from metadata JSON)
- Backdrop: `https://image.tmdb.org/t/p/w780{backdrop_path}` (from metadata JSON)
- No local image files fetched through GitHub API

### Lambda endpoints for metadata

| Method | Path | Description |
|--------|------|-------------|
| POST | `/meta/check` | Compute MD5, fetch `assets/meta/{md5}.json` via GitHub API if it exists |
| POST | `/tmdb/fetch` | New films only — call TMDB API, commit metadata JSON to preview branch |

---

## Key Files in Hugo Project (paths relative to repo root)

| Content | Path |
|---------|------|
| Review markdown files | `content/reviews/*.md` |
| Review images | `assets/images/reviews/` |
| TMDB metadata | `assets/meta/{md5}.json` |
| Free scores | `data/freescores.json` |
| Critic member pages | `content/guild/members/*.md`, `content/guild/board/*.md` |
| Hugo-generated film JSON | `mreviews/index.json`, `mreviews/{slug}/index.json` |
| Hugo-generated critic JSON | `critics/index.json`, `critics/{slug}/index.json` |

---

## Amplify Configuration

**Hugo site (existing Amplify app):**
- `main` branch → `fcgreviews.com`
- `preview` branch → `preview.fcgreviews.com` (new — add branch in existing app)
- Both use the same Hugo `amplify.yml` build spec

**Admin SPA (new Amplify app, same repo):**
- `main` branch → `admin.fcgreviews.com`
- Source: `admin/` subdirectory of the repo
- Build spec: `npm install && npm run build`, publish dir `admin/dist`
- Custom domain: `admin.fcgreviews.com` (one DNS CNAME record)

**Cognito app client configuration:**
- Callback URL: `https://admin.fcgreviews.com`
- Sign-out URL: `https://admin.fcgreviews.com`
- Hosted UI domain: `auth.fcgreviews.com` (or the default Cognito domain)

**API Gateway CORS:**
- Allowed origin: `https://admin.fcgreviews.com` only

---

## Verification (end-to-end)

1. Operator logs in via Cognito → SPA loads with recent films list and critic dropdown populated
2. Click a recent film → film title + TMDB ID pre-filled → right panel shows metadata
3. Fill remaining fields → click Preview → modal renders review correctly
4. Click Test → spinner shows → preview URL opens in new tab after build → review visible on film page
5. Click Save → merges to main → live site rebuilds → new review live
6. Add a review for a new film → enter TMDB ID manually → right panel fetches and displays metadata → metadata committed alongside review
7. Upload a review image → thumbnail shown in form → image appears in preview build
8. Enter critic + existing film → form auto-detects existing review → switches to Edit mode → modify a field → Test → Save → verify on live site
9. Edit free scores → add a critic score → Test → Save → FCG rating updated on film page
