// YouTube Data API v3 helpers for Nimbo auto-posting.
// Tokens are stored in the creator's profile: profile.yt = { access_token, refresh_token, expiry, channel_id, channel_name }

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YT_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

// Returns a valid access_token, refreshing if expired. Updates profile.yt in-place.
async function getValidToken(yt) {
  if (!yt || !yt.refresh_token) throw new Error("YouTube not connected");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");
  // Refresh if expiry within 2 minutes
  if (yt.access_token && yt.expiry && Date.now() < yt.expiry - 120000) {
    return yt.access_token;
  }
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: yt.refresh_token, client_id: clientId, client_secret: clientSecret })
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error("Token refresh failed: " + (data.error_description || data.error || r.status));
  yt.access_token = data.access_token;
  yt.expiry = Date.now() + (data.expires_in || 3600) * 1000;
  return yt.access_token;
}

// Get channel info using a valid token.
async function getChannelInfo(accessToken) {
  const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
    headers: { Authorization: "Bearer " + accessToken }
  });
  const data = await r.json();
  if (!r.ok) throw new Error("YouTube channel fetch failed: " + r.status);
  const ch = (data.items || [])[0];
  if (!ch) throw new Error("No YouTube channel found on this account");
  return { channel_id: ch.id, channel_name: (ch.snippet && ch.snippet.title) || "", subscribers: parseInt(((ch.statistics || {}).subscriberCount) || "0", 10) };
}

// Initiate a resumable YouTube upload. Returns the upload session URL for the client to PUT video bytes to.
// meta = { title, description, tags (array), categoryId, privacyStatus }
async function initiateUpload(accessToken, meta) {
  const body = {
    snippet: {
      title: (meta.title || "").slice(0, 100),
      description: (meta.description || "").slice(0, 5000),
      tags: (meta.tags || []).slice(0, 30),
      categoryId: meta.categoryId || "22" // 22 = People & Blogs
    },
    status: { privacyStatus: meta.privacyStatus || "private" } // start private, creator can publish
  };
  const r = await fetch(YT_UPLOAD_URL + "?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": "video/*"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error("YouTube upload init failed: " + (err.error && err.error.message ? err.error.message : r.status));
  }
  const uploadUrl = r.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube did not return upload URL");
  return uploadUrl;
}

module.exports = { getValidToken, getChannelInfo, initiateUpload };
