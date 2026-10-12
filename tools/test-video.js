// End-to-end: a real brief from Nimbo's engine -> a real MP4 on disk.
//   node tools/test-video.js ["topic"]
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).forEach(function (line) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
});

const { generateBrief } = require("../functions/lib/engine");
const { makeVideo, canRender } = require("../functions/lib/video");

const topic = process.argv[2] || "free AI tools that save creators hours every week";

(async function () {
  console.log("render available:", canRender());
  if (!canRender()) { console.log("ffmpeg/ffprobe or PEXELS_API_KEY missing"); process.exit(1); }

  console.log("1. writing the brief about: " + topic);
  const t0 = Date.now();
  const out = await generateBrief({
    niche: topic, platform: "short",
    profile: { language: "English", onCamera: "faceless", tone: ["energetic", "practical"], audience: "creators" }
  });
  console.log("   title: " + out.brief.title);
  console.log("   script: " + out.brief.script.split(/\s+/).length + " words  (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");

  console.log("2. building the video...");
  const t1 = Date.now();
  const res = await makeVideo({
    brief: out.brief,
    platform: "short",
    outFile: path.join(root, "nimbo_agent_video.mp4"),
    onStep: function (s) { console.log("   - " + s); }
  });
  console.log("");
  console.log("DONE -> " + res.file);
  console.log("   " + Math.round(res.bytes / 1024) + " KB, " + res.seconds + "s, " + res.scenes + " scenes, built in " + ((Date.now() - t1) / 1000).toFixed(1) + "s");
})().catch(function (e) { console.error("FAILED:", (e && e.message) || e); process.exit(1); });
