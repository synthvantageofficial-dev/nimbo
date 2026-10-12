// Returns a fresh YouTube access_token for the signed-in creator.
// The client uses it to upload video directly to YouTube (avoiding Netlify's 6MB function body limit).
const { verifyToken, bearer } = require("./lib/auth");
const store = require("./lib/store");
const { getValidToken } = require("./lib/youtube");

exports.handler = async function(event) {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method not allowed" };
  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "not_signed_in" }) };

  const profile = await store.getProfile(user.sub) || {};
  if (!profile.yt || !profile.yt.refresh_token) {
    return { statusCode: 404, body: JSON.stringify({ error: "youtube_not_connected" }) };
  }

  try {
    const accessToken = await getValidToken(profile.yt);
    // Save updated expiry back to profile
    await store.saveProfile(user.sub, profile);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        channel_id: profile.yt.channel_id,
        channel_name: profile.yt.channel_name
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
