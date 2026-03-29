# Origami Admin Setup

This project now supports an admin editor at `/origami/` and a Cloudflare Worker API at `/origami-api/*`.

## What changed

- Portfolio pages now load artwork content from `data/artworks.json`.
- Pieces can be soft-disabled using `active: false`.
- New admin UI: `origami/index.html`.
- New Worker backend: `cloudflare/origami-worker`.

## 1) Create a GitHub OAuth App

In GitHub:

1. Go to **Settings > Developer settings > OAuth Apps > New OAuth App**.
2. Set:
   - Application name: `Origami Admin` (or your preferred name)
   - Homepage URL: `https://www.lunaart.net`
   - Authorization callback URL: `https://www.lunaart.net/origami-api/auth/callback`
3. Save the app.
4. Copy:
   - `Client ID`
   - `Client Secret`

## 2) Create a GitHub token for repo writes

Create a fine-grained personal access token with access to `thesiou/bia-portfolio` and **Contents: Read and write**.

Store this as `GITHUB_REPO_TOKEN` in Cloudflare Worker secrets.

## 3) Deploy the Cloudflare Worker

From this repo:

```bash
cd cloudflare/origami-worker
npm i -g wrangler
wrangler login
```

Set secrets:

```bash
wrangler secret put GITHUB_REPO_TOKEN
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler secret put COOKIE_SECRET
```

`COOKIE_SECRET` should be a long random string (at least 32 chars).

Check `wrangler.toml` values:

- `GH_OWNER = "thesiou"`
- `GH_REPO = "bia-portfolio"`
- `GH_BRANCH = "main"`
- `GH_DATA_PATH = "data/artworks.json"`
- `OAUTH_ALLOWED_USERS = "thesiou"` (set to your GitHub username, or comma-separated usernames)

Deploy:

```bash
wrangler deploy
```

## 4) Attach Worker route to your domain

In Cloudflare dashboard for `lunaart.net`:

1. Go to **Workers & Pages > your worker > Triggers**.
2. Add route:
   - `www.lunaart.net/origami-api/*`

This keeps the portfolio static on GitHub Pages and sends only `/origami-api/*` to Worker.

## 5) Use the admin UI

1. Open `https://www.lunaart.net/origami/`.
2. Sign in with GitHub.
3. Pick a collection.
4. Add, remove, reorder, or deactivate pieces.
5. Upload media (optional) and copy returned `images/...` path.
6. Save changes.

The Worker commits to `data/artworks.json` (and uploaded files) in your GitHub repo.

## Notes

- `/origami/` is hidden but not fully secure by URL alone; access is controlled by GitHub login allowlist in the Worker.
- GitHub Pages can take a few minutes to reflect commits.
- Current admin editor targets category pieces and section pieces. Subcategory galleries are not yet editor-managed.
