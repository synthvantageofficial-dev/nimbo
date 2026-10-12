// Outbound channels. Nimbo reaches the creator wherever they are — it never waits to be opened.
const S = require("./store");

const TG = "https://api.telegram.org/bot";
const NL = String.fromCharCode(10);
const TG_LIMIT = 3800; // Telegram hard limit is 4096 — stay under it

function tgToken() { return process.env.TELEGRAM_BOT_TOKEN || ""; }

// Split long text (a full YouTube script easily beats the limit) on paragraph/line breaks.
function chunk(text, max) {
  const lim = max || TG_LIMIT;
  const src = String(text == null ? "" : text);
  if (src.length <= lim) return [src];
  const out = [];
  let buf = "";
  const lines = src.split(NL);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (line.length > lim) { // a single monster line
      if (buf) { out.push(buf); buf = ""; }
      out.push(line.slice(0, lim));
      line = line.slice(lim);
    }
    if ((buf + NL + line).length > lim) { out.push(buf); buf = line; }
    else { buf = buf ? (buf + NL + line) : line; }
  }
  if (buf) out.push(buf);
  return out;
}

async function tgCall(method, body) {
  const token = tgToken();
  if (!token) return { ok: false, error: "no_token" };
  try {
    const r = await fetch(TG + token + "/" + method, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const data = await r.json().catch(function () { return {}; });
    return { ok: r.ok && data.ok !== false, status: r.status, data: data };
  } catch (e) { return { ok: false, error: (e && e.message) || "network" }; }
}

async function sendTelegram(chatId, text) {
  const parts = chunk(text);
  let okAll = true;
  for (let i = 0; i < parts.length; i++) {
    const res = await tgCall("sendMessage", { chat_id: chatId, text: parts[i], disable_web_page_preview: true });
    if (!res.ok) okAll = false;
  }
  return okAll;
}

async function sendTyping(chatId) { return tgCall("sendChatAction", { chat_id: chatId, action: "typing" }); }

// Send a finished MP4 to Telegram as a real playable video (bot API allows up to 50MB).
async function sendTelegramVideo(chatId, buffer, caption) {
  const token = tgToken();
  if (!token || !buffer) return false;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", String(caption).slice(0, 1000));
    form.append("supports_streaming", "true");
    form.append("video", new Blob([buffer], { type: "video/mp4" }), "nimbo.mp4");
    const r = await fetch(TG + token + "/sendVideo", { method: "POST", body: form });
    const data = await r.json().catch(function () { return {}; });
    return r.ok && data.ok !== false;
  } catch (e) { return false; }
}

// Download a Telegram voice note and return it base64 so the brain can listen to it.
async function fetchTelegramFile(fileId, maxBytes) {
  const token = tgToken();
  if (!token) return null;
  const info = await tgCall("getFile", { file_id: fileId });
  const path = info && info.data && info.data.result && info.data.result.file_path;
  if (!path) return null;
  const size = (info.data.result.file_size) || 0;
  if (size && size > (maxBytes || 5 * 1024 * 1024)) return null;
  try {
    const r = await fetch("https://api.telegram.org/file/bot" + token + "/" + path);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > (maxBytes || 5 * 1024 * 1024)) return null;
    return { dataBase64: buf.toString("base64"), mimeType: /\.mp3$/.test(path) ? "audio/mp3" : (/\.m4a$/.test(path) ? "audio/mp4" : "audio/ogg") };
  } catch (e) { return null; }
}

// Deliver to a creator on whatever channel they connected. Always also records it in the app,
// so nothing Nimbo says is ever lost.
async function deliver(sub, text, opts) {
  const o = opts || {};
  const profile = o.profile || (await S.getProfile(sub)) || {};
  const chatId = profile.telegram && profile.telegram.chatId;
  // A request that came from the app is answered in the app; a Telegram request goes to Telegram.
  const wantTelegram = (o.channel || "telegram") !== "web";
  let where = "app";
  if (chatId && wantTelegram) {
    const ok = await sendTelegram(chatId, text);
    if (ok) where = "telegram";
  }
  // If a video was made, send the file itself - not a link the creator has to chase.
  if (o.videoId && chatId && wantTelegram) {
    try {
      const buf = await S.getBinary("video/" + o.videoId);
      if (buf) await sendTelegramVideo(chatId, buf, o.videoCaption || "Your video is ready.");
    } catch (e) {}
  }

  // Always keep it in the conversation, whichever channel it went out on - that is Nimbo's memory
  // and what the app shows when the creator comes back.
  await S.addConv(sub, "nimbo", text).catch(function () {});
  return where;
}

module.exports = { sendTelegram, sendTelegramVideo, sendTyping, fetchTelegramFile, deliver, chunk, tgCall, tgToken };
