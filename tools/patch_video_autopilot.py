# -*- coding: utf-8 -*-
# One render path shared by chat and autopilot - otherwise "Nimbo works while you sleep"
# would only ever deliver a script, never a video.
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

# ---- 1. agent.js: pull the render out into a shared, exported helper ----
rw("functions/lib/agent.js", [
("""  // Make the actual video too, when the creator chose Nimbo's free faceless video.
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

  await S.addBrief(sub, out).catch(function () {});""",
 """  await renderVideoFor(sub, out, profile, platform);

  await S.addBrief(sub, out).catch(function () {});"""),

# the helper itself, defined just above doMakeContent
("""async function doMakeContent(sub, profile, d) {""",
 """// Build the real MP4 for a brief, when the creator chose Nimbo's free faceless video.
// A failure here must never lose the brief - they still keep everything that was written.
// Used by chat AND by autopilot, so both deliver the same thing.
async function renderVideoFor(sub, out, profile, platform) {
  const wantsVideo = (profile.videoTool || "free_faceless") === "free_faceless";
  if (!wantsVideo) return out;
  if (!canRender()) { out.videoError = "notready"; return out; }
  try {
    const res = await makeVideo({ brief: out.brief, platform: platform || out.platform || "short", voice: profile.voicePref || "" });
    const fs = require("fs");
    const id = crypto.randomBytes(16).toString("hex");
    await S.putBinary("video/" + id, fs.readFileSync(res.file));
    await S.rememberVideo(sub, id);
    try { fs.rmSync(res.workDir, { recursive: true, force: true }); } catch (e) {}
    out.video = { id: id, seconds: res.seconds, bytes: res.bytes, scenes: res.scenes };
    out.videoUrl = "/.netlify/functions/video-file?id=" + id;
  } catch (e) {
    out.videoError = (e && e.message) || "Video rendering failed.";
  }
  return out;
}

async function doMakeContent(sub, profile, d) {"""),

("module.exports = { handleMessage, formatBrief, checkQuota, ago };",
 "module.exports = { handleMessage, formatBrief, checkQuota, ago, renderVideoFor };"),
])

# ---- 2. autopilot.js: render before delivering ----
rw("functions/lib/autopilot.js", [
('const { formatBrief } = require("./agent");',
 'const { formatBrief, renderVideoFor } = require("./agent");'),

("""      const out = await generateBrief({ niche: profile.niche, platform: profile.platform || "short", brand: profile.brand || "", profile: profile });
      out.auto = true;
      out.source = "autopilot";
      await addBrief(sub, out);""",
 """      const out = await generateBrief({ niche: profile.niche, platform: profile.platform || "short", brand: profile.brand || "", profile: profile });
      out.auto = true;
      out.source = "autopilot";
      // The whole promise: a finished video waiting for them, made while they were away.
      await renderVideoFor(sub, out, profile, profile.platform || "short");
      await addBrief(sub, out);"""),

("""      const intro = "🤖 Nimbo here - you were busy, so I made this for you:" + NL;""",
 """      const intro = "🤖 Nimbo here - you were busy, so I made this for you:" + NL;
      const vline = out.video ? (NL + "🎥 Video ready: " + out.video.seconds + "s, " + out.video.scenes + " scenes.") : "";"""),

("""      const where = await deliver(sub, intro + formatBrief(out) + tail, {""",
 """      const where = await deliver(sub, intro + formatBrief(out) + vline + tail, {"""),
])

print("DONE - autopilot now renders and sends the real video too")
