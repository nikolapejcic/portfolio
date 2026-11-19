// Password gate for the whole site (HTTP Basic Auth).
// Username and password come from Cloudflare Pages environment variables:
//   SITE_USER (e.g. guest) and SITE_PASS. Never commit the password.

const REALM = "Nikola Pejcic portfolio";

function unauthorized() {
  return new Response("This portfolio is private. Please sign in.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Compare without leaking timing information.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export async function onRequest({ request, env, next }) {
  const user = env.SITE_USER, pass = env.SITE_PASS;
  if (!user || !pass) return new Response("Site login is not configured.", { status: 503 });

  const header = request.headers.get("Authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  let decoded;
  try { decoded = atob(encoded); } catch { return unauthorized(); }
  const i = decoded.indexOf(":");
  if (i < 0) return unauthorized();
  if (!safeEqual(decoded.slice(0, i), user) || !safeEqual(decoded.slice(i + 1), pass)) return unauthorized();

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  out.headers.set("Cache-Control", "private, no-store");
  return out;
}
