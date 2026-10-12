// Free faceless video v4 — Pexels footage + Edge-TTS voice + REEL-STYLE word-by-word captions.
const fs = require("fs"), { spawnSync } = require("child_process");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const KEY = "tAI22c5M2PzgIIRe9UVNs7xepFT4OG69qhrEK9M1OFgOMaMPsy3k4A3P";
const SP = "C:/Users/acer/AppData/Local/Temp/claude/C--Users-acer-OneDrive-Desktop-personal-ai-instict/5c7851a9-2ae3-4f27-b0c0-491bcba750cc/scratchpad";
const DIR = SP + "/vid4"; fs.mkdirSync(DIR, { recursive: true });
const FONT = "C\\:/Windows/Fonts/arialbd.ttf";

const segs = [
  { text: "Your toddler is basically a 30 pound kettlebell that screams at you.", q: "mother carrying toddler home" },
  { text: "So use them for leg day. Ten slow squats, driving through your heels.", q: "woman doing squats home workout" },
  { text: "You get a workout, they get a ride. Save this for later!", q: "happy mother playing with child home" }
];

async function getJSON(u) { const r = await fetch(u, { headers: { Authorization: KEY } }); if (!r.ok) throw new Error("pexels " + r.status); return r.json(); }
async function dl(u, f) { const r = await fetch(u); if (!r.ok) throw new Error("dl " + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
async function edgeTTS(text, file) { const tts = new MsEdgeTTS(); await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3); const { audioStream } = tts.toStream(text); await new Promise((res, rej) => { const w = fs.createWriteStream(file); audioStream.pipe(w); w.on("finish", res); w.on("error", rej); audioStream.on("error", rej); }); }
function ff(a) { return spawnSync("ffmpeg", ["-y", ...a], { encoding: "utf8" }); }
function dur(f) { const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", f], { encoding: "utf8" }); return parseFloat((r.stdout || "0").trim()) || 2; }
function pick(v) { const f = (v.video_files || []).filter(x => (x.height || 0) >= (x.width || 0)); f.sort((a, b) => (a.width || 0) - (b.width || 0)); return f.find(x => (x.width || 0) >= 480) || f[f.length - 1] || v.video_files[0]; }
function esc(p) { return p.replace(/\\/g, "/").replace(/:/g, "\\:"); }

(async () => {
  const clips = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]; process.stdout.write("seg " + i + ": search... ");
    const j = await getJSON("https://api.pexels.com/videos/search?query=" + encodeURIComponent(s.q) + "&per_page=5&orientation=portrait");
    const v = (j.videos || [])[0]; if (!v) throw new Error("no vid");
    const f = pick(v); const clip = DIR + "/c" + i + ".mp4", aud = DIR + "/a" + i + ".mp3", seg = DIR + "/s" + i + ".mp4";
    process.stdout.write("dl... "); await dl(f.link, clip);
    process.stdout.write("voice... "); await edgeTTS(s.text, aud);
    const d = dur(aud);

    // word-by-word groups (2 words each), timed evenly across the audio
    const words = s.text.replace(/\s+/g, " ").trim().split(" ");
    const groups = []; for (let k = 0; k < words.length; k += 2) groups.push(words.slice(k, k + 2).join(" "));
    const per = d / groups.length;
    let filters = "scale=540:960:force_original_aspect_ratio=increase,crop=540:960";
    groups.forEach((g, gi) => {
      const gf = DIR + "/g" + i + "_" + gi + ".txt"; fs.writeFileSync(gf, g.toUpperCase());
      const st = (gi * per).toFixed(2), en = ((gi + 1) * per + 0.05).toFixed(2);
      filters += ",drawtext=textfile='" + esc(gf) + "':fontfile='" + FONT + "':fontcolor=white:fontsize=62:borderw=8:bordercolor=black:x=(w-text_w)/2:y=h*0.60:enable='between(t," + st + "," + en + ")'";
    });
    process.stdout.write("render... ");
    let r = ff(["-stream_loop", "-1", "-i", clip, "-i", aud, "-map", "0:v:0", "-map", "1:a:0", "-vf", filters, "-c:v", "libx264", "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", "-r", "25", "-shortest", seg]);
    if (r.status !== 0) { console.log("\nFFERR seg" + i + ":\n" + (r.stderr || "").split("\n").slice(-8).join("\n")); process.exit(1); }
    clips.push(seg); console.log("ok (" + d.toFixed(1) + "s, " + groups.length + " caption groups)");
  }
  fs.writeFileSync(DIR + "/l.txt", clips.map(c => "file '" + c.replace(/\\/g, "/") + "'").join("\n"));
  const out = SP + "/nimbo_faceless_v4.mp4";
  const rc = ff(["-f", "concat", "-safe", "0", "-i", DIR + "/l.txt", "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", out]);
  if (rc.status !== 0) { console.log("CONCATERR\n" + (rc.stderr || "").split("\n").slice(-8).join("\n")); process.exit(1); }
  console.log("DONE -> nimbo_faceless_v4.mp4 (" + Math.round(fs.statSync(out).size / 1024) + " KB)");
})().catch(e => { console.log("ERR:", e.message); process.exit(1); });
