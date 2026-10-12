// Free faceless video v3 — Pexels stock footage + NATURAL Edge-TTS voice + captions.
const fs = require("fs"), { spawnSync } = require("child_process");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const KEY = "tAI22c5M2PzgIIRe9UVNs7xepFT4OG69qhrEK9M1OFgOMaMPsy3k4A3P";
const SP = "C:/Users/acer/AppData/Local/Temp/claude/C--Users-acer-OneDrive-Desktop-personal-ai-instict/5c7851a9-2ae3-4f27-b0c0-491bcba750cc/scratchpad";
const DIR = SP + "/vid3"; fs.mkdirSync(DIR, { recursive: true });

const segs = [
  { text: "Your toddler is basically a thirty pound kettlebell that screams at you.", q: "mother carrying toddler home" },
  { text: "So let's actually use them for leg day. Ten slow squats, driving through your heels.", q: "woman doing squats home workout" },
  { text: "You get a workout, they get a ride. Save this for your next solo parenting shift!", q: "happy mother playing with child home" }
];
function wrap(t, n) { const w = t.split(" "); let l = "", o = []; for (const x of w) { if ((l + " " + x).trim().length > n) { o.push(l.trim()); l = x; } else l += " " + x; } if (l.trim()) o.push(l.trim()); return o.join("\n"); }
async function getJSON(u) { const r = await fetch(u, { headers: { Authorization: KEY } }); if (!r.ok) throw new Error("pexels " + r.status); return r.json(); }
async function dl(u, f) { const r = await fetch(u); if (!r.ok) throw new Error("dl " + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
async function edgeTTS(text, file) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  await new Promise((res, rej) => { const w = fs.createWriteStream(file); audioStream.pipe(w); w.on("finish", res); w.on("error", rej); audioStream.on("error", rej); });
}
function ff(a) { return spawnSync("ffmpeg", ["-y", ...a], { encoding: "utf8" }); }
function pick(v) { const f = (v.video_files || []).filter(x => (x.height || 0) >= (x.width || 0)); f.sort((a, b) => (a.width || 0) - (b.width || 0)); return f.find(x => (x.width || 0) >= 480) || f[f.length - 1] || v.video_files[0]; }

(async () => {
  const clips = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]; process.stdout.write("seg " + i + ": search... ");
    const j = await getJSON("https://api.pexels.com/videos/search?query=" + encodeURIComponent(s.q) + "&per_page=5&orientation=portrait");
    const v = (j.videos || [])[0]; if (!v) throw new Error("no vid");
    const f = pick(v); const clip = DIR + "/c" + i + ".mp4", aud = DIR + "/a" + i + ".mp3", cap = DIR + "/cap" + i + ".txt", seg = DIR + "/s" + i + ".mp4";
    process.stdout.write("dl... "); await dl(f.link, clip);
    process.stdout.write("voice... "); await edgeTTS(s.text, aud);
    fs.writeFileSync(cap, wrap(s.text, 20));
    const ce = cap.replace(/\\/g, "/").replace(/:/g, "\\:");
    const vf = "scale=540:960:force_original_aspect_ratio=increase,crop=540:960,drawbox=y=ih-320:w=iw:h=320:color=black@0.5:t=fill,drawtext=textfile='" + ce + "':fontfile='C\\:/Windows/Fonts/arialbd.ttf':fontcolor=white:fontsize=40:line_spacing=12:x=(w-text_w)/2:y=h-270";
    let r = ff(["-stream_loop", "-1", "-i", clip, "-i", aud, "-map", "0:v:0", "-map", "1:a:0", "-vf", vf, "-c:v", "libx264", "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", "-r", "25", "-shortest", seg]);
    if (r.status !== 0) { r = ff(["-stream_loop", "-1", "-i", clip, "-i", aud, "-map", "0:v:0", "-map", "1:a:0", "-vf", "scale=540:960:force_original_aspect_ratio=increase,crop=540:960", "-c:v", "libx264", "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", "-r", "25", "-shortest", seg]); }
    if (r.status !== 0) { console.log("FFERR\n" + (r.stderr || "").split("\n").slice(-6).join("\n")); process.exit(1); }
    clips.push(seg); console.log("ok");
  }
  fs.writeFileSync(DIR + "/l.txt", clips.map(c => "file '" + c.replace(/\\/g, "/") + "'").join("\n"));
  const out = SP + "/nimbo_faceless_v3.mp4";
  const rc = ff(["-f", "concat", "-safe", "0", "-i", DIR + "/l.txt", "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", out]);
  if (rc.status !== 0) { console.log("CONCATERR\n" + (rc.stderr || "").split("\n").slice(-6).join("\n")); process.exit(1); }
  console.log("DONE -> nimbo_faceless_v3.mp4 (" + Math.round(fs.statSync(out).size / 1024) + " KB)");
})().catch(e => { console.log("ERR:", e.message); process.exit(1); });
