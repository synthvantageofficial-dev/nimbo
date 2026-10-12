// Nimbo's VIDEO ENGINE: turns a written brief into a real MP4, for free.
//
//   script -> scenes (Gemini) -> stock footage (Pexels) -> voice (Edge-TTS)
//          -> reel-style captions + cuts (ffmpeg) -> one finished vertical video
//
// Runs wherever node + ffmpeg exist (the laptop today, a render host later). It never
// needs the creator's browser to be open, so autopilot can finish a video while they sleep.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

// Vertical by default; YouTube long-form gets a landscape frame.
function frameFor(platform) {
  return platform === "youtube_long" ? { w: 854, h: 480, orientation: "landscape" }
                                     : { w: 540, h: 960, orientation: "portrait" };
}

function have(cmd) {
  try { return spawnSync(cmd, ["-version"], { encoding: "utf8" }).status === 0; }
  catch (e) { return false; }
}
// Can this machine render at all?
function canRender() {
  if (process.env.NIMBO_VIDEO === "off") return false;
  if (!process.env.PEXELS_API_KEY) return false;
  return have(FFMPEG) && have(FFPROBE);
}

// ---------------------------------------------------------------- scene plan
const SCENE_SCHEMA = {
  type: "OBJECT",
  properties: {
    scenes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          line: { type: "STRING" },     // what the voice says
          footage: { type: "STRING" }   // what the camera shows (a stock-footage search)
        },
        required: ["line", "footage"]
      }
    }
  },
  required: ["scenes"]
};

// Break the script into spoken lines, each with a shot to show behind it.
async function planScenes(script, opts) {
  const o = opts || {};
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Nimbo's brain isn't configured.");
  const max = o.maxScenes || 6;

  const prompt = [
    "You are a video editor. Turn this script into a shot list for a short vertical video.",
    "",
    "SCRIPT:",
    String(script || "").slice(0, 4000),
    "",
    "Rules:",
    "- Between 3 and " + max + " scenes, in order.",
    "- 'line' = exactly what the voiceover says for that scene. Spoken words ONLY:",
    "  strip every stage direction, bracket, label like [HOOK] or [BODY], emoji and on-screen-text note.",
    "- Keep each 'line' under 22 words so the pacing stays punchy.",
    "- 'footage' = a short, literal, filmable stock-footage search in English (3-6 words),",
    "  e.g. 'man running on treadmill', 'close up laptop typing', 'sunrise over city'.",
    "  Describe a REAL filmable scene - never abstract ideas, logos, text or brand names.",
    "- Together the lines must read as the full script, nothing important dropped."
  ].join("\n");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: SCENE_SCHEMA }
  };

  let lastErr = "Could not plan the shots.";
  for (let i = 0; i < MODELS.length; i++) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODELS[i] + ":generateContent?key=" + key,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(function () { return {}; });
      if (r.ok) {
        const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
        const text = parts.map(function (p) { return p.text || ""; }).join("");
        let out = null;
        try { out = JSON.parse(text); } catch (e) {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) { try { out = JSON.parse(m[0]); } catch (e2) {} }
        }
        const scenes = (out && out.scenes || []).filter(function (s) { return s && s.line && s.footage; }).slice(0, max);
        if (scenes.length >= 2) return scenes;
        lastErr = "The shot list came back empty.";
        continue;
      }
      lastErr = (data && data.error && data.error.message) || lastErr;
    } catch (e) { lastErr = (e && e.message) || lastErr; }
  }
  throw new Error(lastErr);
}

// ---------------------------------------------------------------- pieces
async function pexelsClip(query, orientation) {
  const key = process.env.PEXELS_API_KEY;
  const url = "https://api.pexels.com/videos/search?query=" + encodeURIComponent(query)
            + "&per_page=5&orientation=" + (orientation || "portrait");
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) throw new Error("Stock footage search failed (" + r.status + ")");
  const j = await r.json();
  const vids = j.videos || [];
  if (!vids.length) return null;
  const v = vids[0];
  // Smallest file that is still big enough - keeps the render fast and free.
  const wantPortrait = (orientation || "portrait") === "portrait";
  const files = (v.video_files || []).filter(function (f) {
    return wantPortrait ? (f.height || 0) >= (f.width || 0) : (f.width || 0) >= (f.height || 0);
  });
  files.sort(function (a, b) { return (a.width || 0) - (b.width || 0); });
  const f = files.find(function (x) { return (x.width || 0) >= 480; }) || files[files.length - 1] || v.video_files[0];
  return f ? f.link : null;
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Download failed (" + r.status + ")");
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

async function speak(text, file, voice) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice || "en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  await new Promise(function (resolve, reject) {
    const w = fs.createWriteStream(file);
    audioStream.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
    audioStream.on("error", reject);
  });
}

function seconds(file) {
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file], { encoding: "utf8" });
  return parseFloat((r.stdout || "0").trim()) || 2;
}

// ffmpeg can take minutes, so never block the event loop on it.
function ffmpeg(args, timeoutMs) {
  return new Promise(function (resolve) {
    const p = spawn(FFMPEG, ["-y"].concat(args), { windowsHide: true });
    let err = "";
    p.stderr.on("data", function (d) { err += d.toString(); if (err.length > 8000) err = err.slice(-4000); });
    const t = setTimeout(function () { try { p.kill("SIGKILL"); } catch (e) {} }, timeoutMs || 240000);
    p.on("close", function (code) { clearTimeout(t); resolve({ code: code, err: err }); });
    p.on("error", function (e) { clearTimeout(t); resolve({ code: -1, err: (e && e.message) || "ffmpeg missing" }); });
  });
}

function escPath(p) { return p.replace(/\\/g, "/").replace(/:/g, "\\:"); }

// A caption font that exists on the machine - falls back to ffmpeg's default.
function fontFile() {
  if (process.env.NIMBO_FONT) return process.env.NIMBO_FONT;
  const tries = [
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
  ];
  for (let i = 0; i < tries.length; i++) if (fs.existsSync(tries[i])) return tries[i];
  return "";
}

// Reel-style captions: 2 words at a time, timed across the voice track.
function captionFilters(dir, idx, line, audioSeconds, frame) {
  const font = fontFile();
  const words = String(line).replace(/\s+/g, " ").trim().split(" ");
  const groups = [];
  for (let k = 0; k < words.length; k += 2) groups.push(words.slice(k, k + 2).join(" "));
  if (!groups.length) return "";
  const per = audioSeconds / groups.length;
  const size = Math.round(frame.w / 8.7);   // scales with the frame
  let out = "";
  groups.forEach(function (g, gi) {
    const gf = path.join(dir, "cap" + idx + "_" + gi + ".txt");
    fs.writeFileSync(gf, g.toUpperCase().replace(/["']/g, ""), "utf8");
    const st = (gi * per).toFixed(2);
    const en = ((gi + 1) * per + 0.05).toFixed(2);
    out += ",drawtext=textfile='" + escPath(gf) + "'"
        + (font ? ":fontfile='" + escPath(font) + "'" : "")
        + ":fontcolor=white:fontsize=" + size + ":borderw=" + Math.max(4, Math.round(size / 8))
        + ":bordercolor=black:x=(w-text_w)/2:y=h*0.60:enable='between(t," + st + "," + en + ")'";
  });
  return out;
}

// ---------------------------------------------------------------- the build
// opts: { brief, platform, voice, outFile, workDir, maxScenes, onStep }
async function makeVideo(opts) {
  const o = opts || {};
  if (!canRender()) throw new Error("Video rendering isn't available on this machine yet.");

  const brief = o.brief || {};
  const script = brief.script || "";
  if (!script) throw new Error("There is no script to build from.");

  const frame = frameFor(o.platform);
  const work = o.workDir || fs.mkdtempSync(path.join(os.tmpdir(), "nimbo-vid-"));
  fs.mkdirSync(work, { recursive: true });
  const step = o.onStep || function () {};

  step("planning the shots");
  const scenes = await planScenes(script, { maxScenes: o.maxScenes || 5 });

  const parts = [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    step("scene " + (i + 1) + " of " + scenes.length);

    const link = await pexelsClip(sc.footage, frame.orientation);
    if (!link) continue;                        // no footage for this line - skip, keep going

    const raw = path.join(work, "raw" + i + ".mp4");
    const aud = path.join(work, "voice" + i + ".mp3");
    const seg = path.join(work, "seg" + i + ".mp4");
    await download(link, raw);
    await speak(sc.line, aud, o.voice);
    const dur = seconds(aud);

    const vf = "scale=" + frame.w + ":" + frame.h + ":force_original_aspect_ratio=increase"
             + ",crop=" + frame.w + ":" + frame.h
             + captionFilters(work, i, sc.line, dur, frame);

    const r = await ffmpeg([
      "-stream_loop", "-1", "-i", raw, "-i", aud,
      "-map", "0:v:0", "-map", "1:a:0", "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p", "-r", "25", "-shortest", seg
    ]);
    if (r.code !== 0) throw new Error("Rendering scene " + (i + 1) + " failed. " + r.err.split("\n").slice(-3).join(" "));
    parts.push(seg);
  }

  if (parts.length < 2) throw new Error("Couldn't find enough stock footage for this script.");

  step("joining the cuts");
  const listFile = path.join(work, "parts.txt");
  fs.writeFileSync(listFile, parts.map(function (p) { return "file '" + p.replace(/\\/g, "/") + "'"; }).join("\n"), "utf8");

  const out = o.outFile || path.join(work, "nimbo-video.mp4");
  const rc = await ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", out]);
  if (rc.code !== 0) {
    // Streams did not match - re-encode instead of copying.
    const rc2 = await ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c:v", "libx264", "-preset", "veryfast",
                              "-crf", "26", "-c:a", "aac", "-pix_fmt", "yuv420p", out]);
    if (rc2.code !== 0) throw new Error("Joining the clips failed. " + rc2.err.split("\n").slice(-3).join(" "));
  }

  const size = fs.statSync(out).size;
  step("done");
  return { file: out, bytes: size, seconds: Math.round(seconds(out)), scenes: scenes.length, workDir: work };
}

module.exports = { makeVideo, planScenes, canRender, frameFor };
