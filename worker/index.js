// Login gate for the whole site (Cloudflare Workers).
// Secrets live only in Cloudflare (Settings → Variables and Secrets), never in code:
//   SITE_PASS       main password (the one on sent resumes)
//   SITE_PASS_2     optional second password
//   SESSION_SECRET  signs the session cookie (falls back to SITE_PASS if missing)
// SITE_USER (wrangler.jsonc) is only kept so older cookies and Basic Auth logins still work.
// Visitors without a valid session get a branded, password-only login page. The
// "Request access" form opens the visitor's own email app, addressed to Nikola.

const COOKIE = "pf_session";
const LEGACY_COOKIE = "pf_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const PUBLIC_PATHS = new Set(["/robots.txt"]);
const CONTACT = "nikola.pejcic.to@gmail.com";
const LINKEDIN = "https://www.linkedin.com/in/nikolapejcic";

const enc = new TextEncoder();

function safeEqual(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Old cookie from the username + password page: HMAC of the username, keyed by SITE_PASS.
const legacyToken = (user, pass) => hmac(pass, user + ":v1");

// Session cookie: "<expiry>.<HMAC(SESSION_SECRET, v2.<expiry>)>". Rotating
// SESSION_SECRET signs everyone out.
async function makeSession(secret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await hmac(secret, "v2." + exp)}`;
}

async function validSession(secret, value) {
  const [exp, sig] = String(value || "").split(".");
  if (!/^\d+$/.test(exp || "") || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(secret, "v2." + exp));
}

// Checks every configured password (no early exit).
function passwordOk(env, given) {
  let ok = false;
  for (const p of [env.SITE_PASS, env.SITE_PASS_2]) if (p && safeEqual(given, p)) ok = true;
  return ok;
}

// Old links and scripts may still send Basic Auth: any username, any valid password.
function basicAuthOk(request, env) {
  const [scheme, encoded] = (request.headers.get("Authorization") || "").split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  let decoded;
  try { decoded = atob(encoded); } catch { return false; }
  const i = decoded.indexOf(":");
  return i >= 0 && passwordOk(env, decoded.slice(i + 1));
}

// Free-plan rate limit (binding in wrangler.jsonc). Returns true when blocked.
async function limited(env, request) {
  if (!env.LOGIN_LIMITER) return false;
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const { success } = await env.LOGIN_LIMITER.limit({ key: ip });
  return !success;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function safeNext(next) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") &&
    !next.startsWith("/__login") ? next : "/";
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loginPage({ next = "/", error = "" } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Nikola Pejcic — Portfolio</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --ink: #1b1f26; --pink: #ff29a9; --grey: #808080; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 40px 20px;
         font: 400 16px/24px "IBM Plex Sans", system-ui, sans-serif; color: var(--ink); background: #fafafa; }
  .wrap { width: 100%; max-width: 420px; }
  .logo { display: block; width: 56px; height: auto; margin: 0 0 28px; }
  .card { background: #fff; border: 1px solid #ececee; border-radius: 10px; padding: 32px; }
  .tag { font: 500 12px/16px "IBM Plex Mono", monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--pink); margin: 0 0 8px; }
  h1 { font: 600 26px/34px "IBM Plex Sans", sans-serif; margin: 0 0 8px; }
  .lead { color: #555; margin: 0 0 24px; }
  label { display: block; font: 500 14px/20px "IBM Plex Sans", sans-serif; margin: 0 0 6px; }
  .opt { color: var(--grey); font-weight: 400; }
  input, textarea { width: 100%; font: inherit; color: var(--ink); padding: 10px 12px; border: 1px solid #d4d4d8;
         border-radius: 6px; background: #fff; margin: 0 0 18px; }
  textarea { min-height: 112px; resize: vertical; }
  input:focus, textarea:focus { outline: 2px solid rgba(255,41,169,.35); outline-offset: 1px; border-color: var(--pink); }
  button.primary { width: 100%; font: 600 16px/24px "IBM Plex Sans", sans-serif; color: #fff; background: var(--ink);
         border: 0; border-radius: 6px; padding: 11px 16px; cursor: pointer; }
  button.primary:hover { background: #000; }
  .switch { margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #f0f0f2; font-size: 15px; color: #555; }
  .link { color: var(--pink); text-decoration: none; border-bottom: 1px solid rgba(255,41,169,.35); cursor: pointer; background: none; border-top: 0; border-left: 0; border-right: 0; padding: 0; font: inherit; }
  .back { display: inline-block; margin: 20px 0 0; font-size: 15px; }
  .error { font-size: 14px; line-height: 20px; color: #bb3f31; background: #fcedec; border-radius: 6px; padding: 8px 12px; margin: 0 0 18px; }
  .done-mark { width: 40px; height: 40px; border-radius: 50%; background: #edf7ef; display: grid; place-items: center; margin: 0 0 16px; }
  .small { font-size: 14px; line-height: 20px; color: var(--grey); margin: 0; }
  .small a { color: var(--grey); }
  .foot { font-size: 13px; color: var(--grey); margin: 24px 0 0; text-align: center; }
  .foot a { color: var(--grey); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main class="wrap">
  <section class="card" id="signin">
    <svg class="logo" viewBox="0 0 118.5 56.875" role="img" aria-label="Nikola Pejcic"><path d="M51.5 0V56.875H37.8281L17.7109 21.4844V56.875H4V0H17.7109L37.8281 35.3906V0H51.5Z" fill="#1B1F26" fill-opacity="0.72"/><rect x="59.5" y="43.875" width="13" height="13" fill="#FF29A9"/><rect x="80.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.5"/><rect x="101.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.2"/></svg>
    <h1>Welcome</h1>
    <p class="lead">This portfolio is shared by invitation. Enter the password I sent you.</p>
    ${error === "wrong" ? `<p class="error" role="alert">That password didn’t work. Check the email or resume I sent you, or request access below.</p>` : ""}
    ${error === "limit" ? `<p class="error" role="alert">Too many attempts. Please wait a minute and try again.</p>` : ""}
    <form method="post" action="/__login">
      <input type="hidden" name="next" value="${esc(next)}">
      <input type="hidden" name="username" value="guest" autocomplete="username">
      <label for="p">Password</label>
      <input id="p" name="password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required autofocus>
      <button class="primary" type="submit">Sign in</button>
    </form>
    <p class="switch">Don’t have the details? <button class="link" type="button" data-show="request">Request access</button></p>
  </section>

  <section class="card" id="request" hidden>
    <svg class="logo" viewBox="0 0 118.5 56.875" role="img" aria-label="Nikola Pejcic"><path d="M51.5 0V56.875H37.8281L17.7109 21.4844V56.875H4V0H17.7109L37.8281 35.3906V0H51.5Z" fill="#1B1F26" fill-opacity="0.72"/><rect x="59.5" y="43.875" width="13" height="13" fill="#FF29A9"/><rect x="80.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.5"/><rect x="101.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.2"/></svg>
    <p class="tag">Request access</p>
    <h1>Get the password</h1>
    <p class="lead">Leave your email and a short note, and I’ll send you the password.</p>
    <form id="reqForm">
      <label for="e">Work email</label>
      <input id="e" type="email" autocomplete="email" placeholder="you@company.com" required>
      <label for="m">Message <span class="opt">(optional)</span></label>
      <textarea id="m" placeholder="Who you are and the role you’re hiring for"></textarea>
      <button class="primary" type="submit">Send request</button>
    </form>
    <button class="link back" type="button" data-show="signin">← Back to sign in</button>
  </section>

  <section class="card" id="sent" hidden>
    <svg class="logo" viewBox="0 0 118.5 56.875" role="img" aria-label="Nikola Pejcic"><path d="M51.5 0V56.875H37.8281L17.7109 21.4844V56.875H4V0H17.7109L37.8281 35.3906V0H51.5Z" fill="#1B1F26" fill-opacity="0.72"/><rect x="59.5" y="43.875" width="13" height="13" fill="#FF29A9"/><rect x="80.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.5"/><rect x="101.5" y="43.875" width="13" height="13" fill="#FF29A9" fill-opacity="0.2"/></svg>
    <div class="done-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#418b4e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h1>Almost there</h1>
    <p class="lead">Your email app should open with the request. Send it, and I’ll email the password to <b id="sentTo"></b>.</p>
    <p class="small">Nothing opened? Email me at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    <button class="link back" type="button" data-show="signin">← Back to sign in</button>
  </section>

  <p class="foot">Nikola Pejcic · Design leader · <a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a></p>
</main>
<script>
  function show(id) { ["signin", "request", "sent"].forEach(function (s) { document.getElementById(s).hidden = s !== id; }); }
  document.querySelectorAll("[data-show]").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.show); }); });
  document.getElementById("reqForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = document.getElementById("e").value.trim();
    var msg = document.getElementById("m").value.trim();
    var body = "Hi Nikola,\\n\\nI'd like access to your portfolio.\\n\\nEmail: " + email + (msg ? "\\n\\n" + msg : "") + "\\n";
    document.getElementById("sentTo").textContent = email;
    show("sent");
    window.location.href = "mailto:${CONTACT}?subject=" + encodeURIComponent("Portfolio access request") + "&body=" + encodeURIComponent(body);
  });
</script>
</body>
</html>`;
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...extra,
    },
  });
}

export default {
  async fetch(request, env) {
    if (!env.SITE_PASS) return new Response("Site login is not configured.", { status: 503 });

    const url = new URL(request.url);
    const secret = env.SESSION_SECRET || env.SITE_PASS;
    const secure = url.protocol === "https:" ? "; Secure" : ""; // plain http only in local dev

    // robots.txt stays public so crawlers can read "Disallow: /"
    if (PUBLIC_PATHS.has(url.pathname)) return withHeaders(await env.ASSETS.fetch(request));

    // Sign-in form submission
    if (url.pathname === "/__login" && request.method === "POST") {
      const form = await request.formData();
      const next = safeNext(form.get("next"));
      if (await limited(env, request)) return html(loginPage({ next, error: "limit" }), 429, { "Retry-After": "60" });
      if (!passwordOk(env, String(form.get("password") || "").trim())) return html(loginPage({ next, error: "wrong" }), 401);
      return new Response(null, {
        status: 303,
        headers: [
          ["Location", next],
          ["Set-Cookie", `${COOKIE}=${await makeSession(secret)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly${secure}; SameSite=Lax`],
          ["Set-Cookie", `${LEGACY_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`],
          ["Cache-Control", "no-store"],
        ],
      });
    }
    if (url.pathname === "/__login") return Response.redirect(url.origin + "/", 303);

    // Signed in? New cookie, an older cookie, or a Basic Auth header.
    let ok = await validSession(secret, getCookie(request, COOKIE));
    if (!ok && env.SITE_USER && getCookie(request, LEGACY_COOKIE)) {
      ok = safeEqual(getCookie(request, LEGACY_COOKIE), await legacyToken(env.SITE_USER, env.SITE_PASS));
    }
    if (!ok) {
      const basic = basicAuthOk(request, env);
      if (basic === false && (await limited(env, request))) return new Response("Too many attempts.", { status: 429 });
      ok = basic === true;
    }
    if (!ok) return html(loginPage({ next: url.pathname + url.search }), 401);

    return withHeaders(await env.ASSETS.fetch(request));
  },
};

function withHeaders(res) {
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  out.headers.set("Cache-Control", "private, no-store");
  return out;
}
