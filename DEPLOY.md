# Deploying the portfolio (password protected)

Last updated: 2026-11-19

Hosting: Cloudflare Workers (free), code in a private GitHub repo.
Only the `v2-figma` folder is published (see `wrangler.jsonc`). `worker/index.js`
asks for a username and password before any page or image loads.
(`functions/_middleware.js` is the same gate for the older Cloudflare Pages setup.)

## One-time setup (about 10 minutes)

### 1. Put the code on GitHub (private)
1. github.com → New repository → name `portfolio` → **Private** → Create.
   Don't add a README or .gitignore (the repo already has them).
2. In Terminal:
   ```
   cd ~/Projects/portfolio
   git remote add origin https://github.com/<your-username>/portfolio.git
   git push -u origin main
   ```

### 2. Connect Cloudflare (Workers)
1. dash.cloudflare.com → Workers & Pages → Create → Import a repository → `portfolio`.
2. Build command: *(leave empty)*. Deploy command: `npx wrangler deploy` (default).
3. Deploy. The first visit shows "Site login is not configured" until step 3.

### 3. Add the password
Project → Settings → Variables and Secrets → Add → type **Secret**:
`SITE_PASS` = *(the password; not stored in this repo)*. `SITE_USER` (guest) is already in `wrangler.jsonc`.
When the free daily limit (100,000 requests) is used up, the site stops serving; it never opens without the login.

### 4. Check it
- Open the .pages.dev address in a private window: it should ask for a login.
- Wrong password → asked again. Right one → site loads, images too.

## Day to day
- Edit, then `git add -A && git commit -m "…" && git push`. Cloudflare redeploys in about a minute.
- Change the password: Cloudflare → project → Settings → Variables and Secrets → edit `SITE_PASS`.
- Optional: add your own domain under Custom domains.
