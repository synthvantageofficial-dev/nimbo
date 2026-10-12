// Verify a Google ID token (from Sign in with Google) and return the user, or null.
async function verifyToken(idToken) {
  if (!idToken) return null;
  // LOCAL DEVELOPMENT ONLY: `netlify dev` with NIMBO_DEV_USER set lets the app be used
  // without Google sign-in, so the agent can be tested end to end on a laptop.
  // This env var is never set on the live site, so production is unaffected.
  if (process.env.NIMBO_DEV_USER && idToken === "dev") {
    return { sub: "dev-" + process.env.NIMBO_DEV_USER, email: process.env.NIMBO_DEV_USER, name: "Dev Creator", picture: "" };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    if (!r.ok) return null;
    const p = await r.json();
    if (!p || p.aud !== clientId) return null;
    if (p.iss !== "accounts.google.com" && p.iss !== "https://accounts.google.com") return null;
    if (p.exp && (Date.now() / 1000) > Number(p.exp)) return null;
    if (!p.sub) return null;
    return { sub: p.sub, email: p.email || "", name: p.name || "", picture: p.picture || "" };
  } catch (e) {
    return null;
  }
}

function bearer(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  return h.replace(/^Bearer\s+/i, "").trim();
}

module.exports = { verifyToken, bearer };
