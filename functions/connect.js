// Gives the signed-in creator a one-time code (and a one-tap link) to pair their Telegram with Nimbo.
const { verifyToken, bearer } = require("./lib/auth");
const S = require("./lib/store");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  const profile = (await S.getProfile(user.sub)) || {};
  const bot = process.env.TELEGRAM_BOT_USERNAME || "";
  const connected = !!(profile.telegram && profile.telegram.chatId);

  // Disconnect from the app side.
  if (event.httpMethod === "DELETE" || (event.httpMethod === "POST" && /disconnect/.test(event.body || ""))) {
    if (profile.telegram && profile.telegram.chatId) {
      await S.unlinkChannel("telegram", profile.telegram.chatId);
      profile.telegram = null;
      profile.updatedAt = Date.now();
      await S.saveProfile(user.sub, profile);
      await S.addEvent(user.sub, "connect", "Telegram disconnected");
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, connected: false, bot: bot }) };
  }

  if (connected) {
    return { statusCode: 200, headers, body: JSON.stringify({
      connected: true, bot: bot, username: profile.telegram.username || "", since: profile.telegram.at || null
    }) };
  }

  const code = await S.makeLinkCode(user.sub);
  // Always also map their email, so an email to Nimbo is recognised as them.
  if (user.email) await S.linkChannel("email", user.email, user.sub).catch(function () {});

  return { statusCode: 200, headers, body: JSON.stringify({
    connected: false, code: code, bot: bot,
    link: bot ? ("https://t.me/" + bot + "?start=" + code) : "",
    expiresInMinutes: 30
  }) };
};
