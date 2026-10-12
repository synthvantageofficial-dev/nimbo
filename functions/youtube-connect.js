// OAuth 2.0 callback for YouTube connection.
// Google redirects here after the creator authorises YouTube access.
// Exchanges the code for tokens, stores them in profile, redirects back to app.
const { verifyToken, bearer } = require("./lib/auth");
const store = require("./lib/store");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function redirectTo(appUrl, params) {
  const u = new URL(appUrl || "https://nimbo-4sc3.netlify.app/app.html");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return { statusCode: 302, headers: { Location: u.toString() }, body: "" };
}

exports.handler = async function(event) {
  const appUrl = process.env.NIMBO_APP_URL || "https://nimbo-4sc3.netlify.app/app.html";
  const qs = event.queryStringParameters || {};
  const code = qs.code;
  const state = qs.state; // user's sub passed as state param
  const error = qs.error;

  if (error) return redirectTo(appUrl, { yt_error: error });
  if (!code || !state) return redirectTo(appUrl, { yt_error: "missing_params" });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = (process.env.NIMBO_APP_URL || "https://nimbo-4sc3.netlify.app/app.html").replace("/app.html", "") + "/.netlify/functions/youtube-connect";

  try {
    // Exchange code for tokens
    const tr = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tr.json();
    if (!tr.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || "token exchange failed");

    // Get channel info
    const chr = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: "Bearer " + tokens.access_token }
    });
    const chdata = await chr.json();
    const ch = (chdata.items || [])[0];
    const channelName = (ch && ch.snippet && ch.snippet.title) || "Unknown Channel";
    const channelId = (ch && ch.id) || "";

    // Store tokens in profile
    const profile = await store.getProfile(state) || {};
    profile.yt = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
      channel_id: channelId,
      channel_name: channelName,
      connected_at: Date.now()
    };
    await store.saveProfile(state, profile);

    return redirectTo(appUrl, { yt_connected: "1", yt_channel: channelName });
  } catch (e) {
    return redirectTo(appUrl, { yt_error: encodeURIComponent(e.message || "unknown") });
  }
};
