# Deploying the portfolio (password protected)

Last updated: 2026-11-19

Hosting: Cloudflare Pages (free), code in a private GitHub repo.
Only the `v2-figma` folder is published. `functions/_middleware.js` asks for a
username and password before any page or image loads.

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

### 2. Connect Cloudflare Pages
1. Sign up at dash.cloudflare.com (free).
2. Workers & Pages → Create → Pages → **Connect to Git** → pick `portfolio`.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **v2-figma**
   - Root directory: *(leave empty)*
4. Environment variables (Production), add both and mark the password **Encrypt**:
   - `SITE_USER` = `guest`
   - `SITE_PASS` = *(the password; not stored in this repo)*
5. Save and Deploy. The site gets an address like `portfolio-xyz.pages.dev`.

### 3. Fail closed (important)
Settings → Functions → set the daily-limit behaviour to **Fail closed**.
Otherwise, if the free daily limit (100,000 requests) is ever used up,
the login check is skipped and the site opens to anyone.

### 4. Check it
- Open the .pages.dev address in a private window: it should ask for a login.
- Wrong password → asked again. Right one → site loads, images too.

## Day to day
- Edit, then `git add -A && git commit -m "…" && git push`. Cloudflare redeploys in about a minute.
- Change the password: Cloudflare → project → Settings → Variables → edit `SITE_PASS` → redeploy.
- Optional: add your own domain under Custom domains.
