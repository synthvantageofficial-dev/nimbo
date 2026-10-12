// Telegram webhook — the creator's direct line to Nimbo. Text or voice note, free, worldwide.
// This handler stays FAST: identify, acknowledge, queue. The worker does the heavy work.
const S = require("./lib/store");
const { sendTelegram, sendTyping, fetchTelegramFile } = require("./lib/channels");
const { kick } = require("./lib/worker");

const NL = String.fromCharCode(10);
const APP = process.env.NIMBO_APP_URL || "https://nimbo-4sc3.netlify.app/app.html";

const WELCOME = [
  "👋 I'm Nimbo - your content team.",
  "",
  "Send me your 6-character code to connect (find it under 'Connect Telegram' in the Nimbo app):",
  APP
].join(NL);

const HELP = [
  "Just tell me what you need and I'll do it:",
  "",
  "• \"make a reel about gym motivation\"",
  "• \"make a long YouTube video\"",
  "• \"what's trending\"",
  "• \"work on your own every day\"  (autopilot ON)",
  "• \"how many videos are left\"",
  "",
  "🎤 You can send a voice note too - I'll listen to it.",
  "Write in any language; I'll always reply in English."
].join(NL);

function okJSON(extra) {
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ ok: true }, extra || {})) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return okJSON({ ignored: "method" });

  // Telegram sends this secret on every call — it proves the request is really from Telegram.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (secret) {
    const h = event.headers || {};
    const got = h["x-telegram-bot-api-secret-token"] || h["X-Telegram-Bot-Api-Secret-Token"] || "";
    if (got !== secret) return { statusCode: 401, body: "no" };
  }

  let update = {};
  try { update = JSON.parse(event.body || "{}"); } catch (e) { return okJSON({ ignored: "bad_json" }); }

  const msg = update.message || update.edited_message || null;
  if (!msg || !msg.chat) return okJSON({ ignored: "no_message" });
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();
  const voice = msg.voice || msg.audio || null;

  let sub = await S.subForChannel("telegram", chatId);

  // ---------- not linked yet: expect a connect code ----------
  if (!sub) {
    const maybe = text.replace(/^\/start\s*/i, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (maybe.length === 6) {
      const owner = await S.useLinkCode(maybe);
      if (owner) {
        await S.linkChannel("telegram", chatId, owner);
        const profile = (await S.getProfile(owner)) || {};
        profile.telegram = { chatId: chatId, username: (msg.from && msg.from.username) || "", at: Date.now() };
        profile.updatedAt = Date.now();
        await S.saveProfile(owner, profile);
        await S.addEvent(owner, "connect", "Telegram connected");
        await sendTelegram(chatId, "✅ Connected! I'm your agent now." + NL + NL + HELP);
        return okJSON({ linked: true });
      }
      await sendTelegram(chatId, "That code is wrong or expired. Grab a fresh one from the Nimbo app: " + APP);
      return okJSON({ linked: false });
    }
    await sendTelegram(chatId, WELCOME);
    return okJSON({ linked: false });
  }

  // ---------- linked ----------
  if (/^\/(help|start)$/i.test(text)) { await sendTelegram(chatId, HELP); return okJSON({ help: true }); }
  if (/^\/stop$/i.test(text)) {
    await S.unlinkChannel("telegram", chatId);
    const p = (await S.getProfile(sub)) || {};
    p.telegram = null; p.updatedAt = Date.now();
    await S.saveProfile(sub, p).catch(function () {});
    await S.addEvent(sub, "connect", "Telegram disconnected");
    await sendTelegram(chatId, "Telegram disconnected. Send a new code from the app whenever you want to reconnect.");
    return okJSON({ unlinked: true });
  }

  let audio = null;
  if (voice && voice.file_id) {
    await sendTyping(chatId);
    audio = await fetchTelegramFile(voice.file_id);
    if (!audio) {
      await sendTelegram(chatId, "I couldn't open that voice note. Try a shorter one, or just type it.");
      return okJSON({ audio: false });
    }
  }
  if (!text && !audio) { await sendTelegram(chatId, HELP); return okJSON({ ignored: "empty" }); }

  await S.queueTask({ sub: sub, text: text, audio: audio, channel: "telegram", chatId: chatId });
  await sendTyping(chatId);
  await sendTelegram(chatId, audio ? "🎧 Got it, working on this..." : "⏳ On it, working...");
  await kick(event);

  return okJSON({ queued: true });
};
