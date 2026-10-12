# -*- coding: utf-8 -*-
# Founder: "usne sab kuch kiya... lekin video to banayi nahi hai actually"
# So: when the creator's setup says "free faceless video", Nimbo now renders a real MP4
# after writing the brief, stores it, and sends it on whatever channel they used.
import io

ROOT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/"

def rw(path, pairs):
    p = ROOT + path
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        if new in s:
            print("  (already) " + path); continue
        assert old in s, "MISSING in " + path + " -> " + old[:70]
        s = s.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    print("  patched " + path)

# ---------------------------------------------------------------- agent.js
rw("functions/lib/agent.js", [
# imports
('const { generateBrief, getTrending, viewsShort } = require("./engine");',
 'const { generateBrief, getTrending, viewsShort } = require("./engine");\nconst { makeVideo, canRender } = require("./video");\nconst crypto = require("crypto");'),

# render after the brief
('''  const out = await generateBrief({ niche: topic, platform: platform, brand: profile.brand || "", profile: profile });
  out.source = d.channel || "chat";
  await S.addBrief(sub, out).catch(function () {});''',
 '''  const out = await generateBrief({ niche: topic, platform: platform, brand: profile.brand || "", profile: profile });
  out.source = d.channel || "chat";

  // Make the actual video too, when the creator chose Nimbo's free faceless video.
  // A failure here must never lose the brief - they still get everything that was written.
  const wantsVideo = (profile.videoTool || "free_faceless") === "free_faceless";
  if (wantsVideo && canRender()) {
    try {
      const res = await makeVideo({ brief: out.brief, platform: platform, voice: profile.voicePref || "" });
      const id = crypto.randomBytes(16).toString("hex");
      await S.putBinary("video/" + id, require("fs").readFileSync(res.file));
      await S.rememberVideo(sub, id);
      try { require("fs").rmSync(res.workDir, { recursive: true, force: true }); } catch (e) {}
      out.video = { id: id, seconds: res.seconds, bytes: res.bytes, scenes: res.scenes };
      out.videoUrl = "/.netlify/functions/video-file?id=" + id;
    } catch (e) {
      out.videoError = (e && e.message) || "Video rendering failed.";
    }
  } else if (wantsVideo) {
    out.videoError = "notready";
  }

  await S.addBrief(sub, out).catch(function () {});'''),

# tell the creator what happened with the video
('''  const left = Math.max(0, gate.limit - count);
  return {
    reply: formatBrief(out) + NL + NL + "(" + left + " videos left this month)",
    brief: out
  };''',
 '''  const left = Math.max(0, gate.limit - count);
  let videoLine = "";
  if (out.video) {
    videoLine = NL + NL + "🎥 Your video is ready - " + out.video.seconds + "s, " + out.video.scenes + " scenes. It's in your Nimbo, and I'm sending it to you now.";
  } else if (out.videoError === "notready") {
    videoLine = NL + NL + "🎥 Video rendering isn't switched on yet on this server - you have the full script above in the meantime.";
  } else if (out.videoError) {
    videoLine = NL + NL + "🎥 I couldn't finish the video this time (" + out.videoError + "). The script above is ready to shoot.";
  }
  return {
    reply: formatBrief(out) + videoLine + NL + NL + "(" + left + " videos left this month)",
    brief: out
  };'''),
])

# ---------------------------------------------------------------- channels.js: send the file
rw("functions/lib/channels.js", [
('async function sendTyping(chatId) { return tgCall("sendChatAction", { chat_id: chatId, action: "typing" }); }',
 '''async function sendTyping(chatId) { return tgCall("sendChatAction", { chat_id: chatId, action: "typing" }); }

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
}'''),

('''  // Always keep it in the conversation, whichever channel it went out on - that is Nimbo's memory
  // and what the app shows when the creator comes back.
  await S.addConv(sub, "nimbo", text).catch(function () {});
  return where;''',
 '''  // If a video was made, send the file itself - not a link the creator has to chase.
  if (o.videoId && chatId && wantTelegram) {
    try {
      const buf = await S.getBinary("video/" + o.videoId);
      if (buf) await sendTelegramVideo(chatId, buf, o.videoCaption || "Your video is ready.");
    } catch (e) {}
  }

  // Always keep it in the conversation, whichever channel it went out on - that is Nimbo's memory
  // and what the app shows when the creator comes back.
  await S.addConv(sub, "nimbo", text).catch(function () {});
  return where;'''),

('module.exports = { sendTelegram, sendTyping, fetchTelegramFile, deliver, chunk, tgCall, tgToken };',
 'module.exports = { sendTelegram, sendTelegramVideo, sendTyping, fetchTelegramFile, deliver, chunk, tgCall, tgToken };'),
])

# ---------------------------------------------------------------- worker passes the video through
rw("functions/lib/worker.js", [
('    const where = await deliver(task.sub, out.reply, { channel: task.channel || "telegram" });',
 '''    const vid = (out.brief && out.brief.video) ? out.brief.video.id : null;
    const where = await deliver(task.sub, out.reply, {
      channel: task.channel || "telegram",
      videoId: vid,
      videoCaption: (out.brief && out.brief.brief && out.brief.brief.title) || ""
    });'''),
])

# ---------------------------------------------------------------- autopilot sends it too
rw("functions/lib/autopilot.js", [
('      const where = await deliver(sub, intro + formatBrief(out) + tail, { profile: profile, channel: "telegram" });',
 '''      const where = await deliver(sub, intro + formatBrief(out) + tail, {
        profile: profile, channel: "telegram",
        videoId: out.video ? out.video.id : null, videoCaption: title
      });'''),
])

print("DONE - Nimbo now makes and delivers the actual video")
