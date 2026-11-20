# Deploying the portfolio (password protected)

Last updated: 2026-11-20 (password-only login, two passwords)

Hosting: Cloudflare Workers (free), code in a private GitHub repo.
Only the `v2-figma` folder is published (see `wrangler.jsonc`). `worker/index.js`
shows a branded, password-only login page before any page or image loads, and remembers a
signed-in visitor for 30 days (signed cookie). Either password works. Older Basic Auth
logins and older cookies still work. `robots.txt` is the only public file. Login attempts are
limited to 10 per minute per IP. "Request access" opens the visitor's email app, addressed
to nikola.pejcic.to@gmail.com.

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
- `SITE_PASS` = main password *(not stored in this repo)*
- `SITE_PASS_2` = optional second password
- `SESSION_SECRET` = a long random string (signs the login cookie; if missing, `SITE_PASS` is used)

`SITE_USER` (guest) in `wrangler.jsonc` only keeps older cookies and Basic Auth logins working.
Local testing: put test values for the same three names in `.dev.vars` (git-ignored), then `npx wrangler dev`.
When the free daily limit (100,000 requests) is used up, the site stops serving; it never opens without the login.

### 4. Check it
- Open the site address in a private window: it should show the login page.
- Wrong password → error message. Right one → site loads, images too.

## Day to day
- Edit, then `git add -A && git commit -m "…" && git push`. Cloudflare redeploys in about a minute.
- Change the password: Cloudflare → project → Settings → Variables and Secrets → edit `SITE_PASS` or `SITE_PASS_2`. People already signed in stay signed in; to sign everyone out, change `SESSION_SECRET`.
- Optional: add your own domain under Custom domains.
