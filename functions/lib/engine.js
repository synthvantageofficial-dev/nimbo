// Nimbo content-generation core. Used by the HTTP endpoint AND the autopilot scheduler.
const MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];

const PLATFORMS = {
  short:        { ui: "Short-form (Reels / TikTok / Shorts)", label: "a short-form vertical video (Reels / TikTok / Shorts)", script: "a punchy spoken-style script for a 30-60 SECOND vertical short — about 90-150 words total. Structure it [HOOK] [BODY] [CTA]; the first 2 seconds must stop the scroll; add a short note on on-screen text", title: "a punchy caption/title under 80 characters with a strong hook" },
  instagram:    { ui: "Instagram Reel", label: "an Instagram Reel", script: "a punchy spoken-style script for a 20-45 SECOND Instagram Reel — about 70-130 words total. Structure it [HOOK] [BODY] [CTA]; native and trendy; suggest a trending-audio style and on-screen text", title: "a scroll-stopping Reel caption/title under 80 characters" },
  tiktok:       { ui: "TikTok", label: "a TikTok video", script: "a punchy spoken-style script for a 20-45 SECOND TikTok — about 70-130 words total. Structure it [HOOK] [BODY] [CTA]; authentic and native to TikTok; suggest a trending-sound style and on-screen text", title: "a punchy TikTok caption/title under 80 characters" },
  shorts:       { ui: "YouTube Short", label: "a YouTube Short", script: "a punchy spoken-style script for a 30-60 SECOND YouTube Short — about 90-150 words total. Structure it [HOOK] [BODY] [CTA]; fast and punchy; add a short note on on-screen text", title: "a punchy YouTube Short title under 70 characters" },
  youtube_long: { ui: "YouTube — long video", label: "a long-form YouTube video", script: "a DETAILED long-form script for a 6-10 MINUTE YouTube video — roughly 800-1200 words. Structure it as [HOOK] (first 15 seconds), then 4-6 sections each written as '[SECTION: <section title>]' followed by several full sentences of real talking points, then '[OUTRO]' with a clear CTA. This MUST be long and in-depth — do NOT write a short 60-second script", title: "an SEO-optimized YouTube title under 60 characters with a searchable keyword" }
};
function platformCfg(p) { return PLATFORMS[p] || PLATFORMS.short; }

const SCHEMA = {
  type: "OBJECT",
  properties: {
    ideas: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, hook: { type: "STRING" }, why: { type: "STRING" } }, required: ["title", "hook", "why"] } },
    best_pick_index: { type: "INTEGER" },
    script: { type: "STRING" },
    title: { type: "STRING" },
    thumbnail_text: { type: "STRING" },
    thumbnail_image_prompt: { type: "STRING" },
    description: { type: "STRING" },
    hashtags: { type: "ARRAY", items: { type: "STRING" } }
  },
  required: ["ideas", "best_pick_index", "script", "title", "thumbnail_text", "thumbnail_image_prompt", "description", "hashtags"]
};

function viewsShort(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return String(n);
}

// Build a free, no-key thumbnail image URL (Pollinations) from the brief's thumbnail concept.
function buildThumbUrl(brief, niche, platform) {
  var isLong = platform === "youtube_long";
  var w = isLong ? 1280 : 576;   // 16:9 for long, 9:16 for vertical (free-tier friendly sizes)
  var h = isLong ? 720 : 1024;
  var base = ((brief && brief.thumbnail_image_prompt) || (brief && brief.thumbnail_concept) || niche || "").toString();
  var prompt = base + " No text, no letters, no words. Vivid saturated colors, high contrast, dramatic cinematic lighting, ultra sharp, professional, photorealistic.";
  var seed = 7; for (var i = 0; i < base.length; i++) { seed = (seed * 31 + base.charCodeAt(i)) >>> 0; }
  return "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt.slice(0, 480)) + "?width=" + w + "&height=" + h + "&nologo=true&model=flux&seed=" + (seed % 100000);
}

async function getTrending(niche, ytKey) {
  try {
    const publishedAfter = new Date(Date.now() - 30 * 864e5).toISOString();
    const searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=25"
      + "&publishedAfter=" + encodeURIComponent(publishedAfter) + "&relevanceLanguage=en"
      + "&q=" + encodeURIComponent(niche) + "&key=" + ytKey;
    const sr = await fetch(searchUrl);
    if (!sr.ok) return [];
    const sdata = await sr.json();
    const ids = (sdata.items || []).filter((it) => it.id && it.id.videoId).map((it) => it.id.videoId).slice(0, 25);
    if (!ids.length) return [];
    const vr = await fetch("https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=" + ids.join(",") + "&key=" + ytKey);
    if (!vr.ok) return [];
    const vdata = await vr.json();
    const now = Date.now();
    const vids = (vdata.items || []).map((v) => {
      const views = parseInt((v.statistics && v.statistics.viewCount) || "0", 10);
      const pub = Date.parse((v.snippet && v.snippet.publishedAt) || "") || now;
      const ageDays = Math.max(1, Math.round((now - pub) / 864e5));
      return { title: (v.snippet && v.snippet.title) || "", channel: (v.snippet && v.snippet.channelTitle) || "", views: views, ageDays: ageDays, velocity: views / ageDays, url: "https://youtu.be/" + v.id };
    });
    vids.sort((a, b) => b.velocity - a.velocity);
    return vids.slice(0, 6).map((v) => ({ title: v.title, channel: v.channel, views: v.views, ageDays: v.ageDays, url: v.url }));
  } catch (e) { return []; }
}

function parseBrief(data) {
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.map((p) => p.text || "").join("");
  try { return JSON.parse(text); } catch (e) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
  return null;
}

// Generate one content brief. Returns the brief object, or throws an Error with a user-facing message.
async function generateBrief(opts) {
  let niche = (opts.niche || "").toString().trim();
  let platform = opts.platform || "short";
  const P = opts.profile || {};
  const brand = (opts.brand || P.brand || "").toString().slice(0, 600);
  if (niche.length > 150) niche = niche.slice(0, 150);
  if (!niche) throw new Error("Please provide a niche.");

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Nimbo's brain isn't configured yet.");
  const cfg = platformCfg(platform);

  // YouTube trend data is only relevant / accurate for YouTube platforms.
  // For Instagram/TikTok/other, we skip the API call and let Gemini use its platform knowledge instead.
  const isYouTubePlatform = (platform === "youtube_long" || platform === "shorts");
  const ytKey = process.env.YOUTUBE_API_KEY;
  const trending = (isYouTubePlatform && ytKey) ? await getTrending(niche, ytKey) : [];
  let trendBlock = "";
  if (isYouTubePlatform && trending.length) {
    trendBlock = "\n\nVideos TRENDING in this niche on YouTube RIGHT NOW (last 30 days, ranked by how fast they are gaining views) — title (views, age):\n"
      + trending.map((v) => "- \"" + v.title + "\" (" + viewsShort(v.views) + " views, " + v.ageDays + "d old)").join("\n")
      + "\nThese reflect the CURRENT trend. Ride the angles and formats clearly working now, but make the creator's take original and specific. Do NOT copy these titles verbatim.";
  } else if (!isYouTubePlatform) {
    trendBlock = "\n\nNOTE ON TRENDS: Real-time trend data APIs exist only for YouTube. For " + cfg.ui + ", apply your own knowledge of what content formats, sounds, hooks, and topics are currently performing well on this platform for " + niche + " creators. Focus on platform-native patterns — what actually works on " + cfg.ui + " right now, not YouTube trends.";
  }
  // Build a rich creator context from the one-time setup profile.
  const bits = [];
  if (P.creatorName) bits.push("Creator / channel name: " + P.creatorName);
  if (P.audience) bits.push("Target audience: " + P.audience);
  if (P.subTopics && P.subTopics.length) bits.push("Recurring themes: " + P.subTopics.join(", "));
  if (P.tone && P.tone.length) bits.push("Tone: " + P.tone.join(", "));
  if (P.onCamera) bits.push(P.onCamera === "face" ? "The creator appears ON CAMERA." : "FACELESS creator - never write lines that require showing their face.");
  if (P.videoStyle) bits.push("Video style: " + P.videoStyle);
  if (P.size) bits.push("Channel size: " + P.size);
  if (P.country) bits.push("Country / region: " + P.country);
  if (P.inspirations) bits.push("Creators they admire (style reference only, never copy): " + P.inspirations);
  if (brand) bits.push("Brand voice to match exactly: \"" + brand + "\"");
  const NL = String.fromCharCode(10);
  const creatorBlock = bits.length ? "CREATOR PROFILE (use ALL of this - the brief must feel made for THIS creator, not generic):" + NL + "- " + bits.join(NL + "- ") : "";
  const lang = (P.language || "English").toString();
  const langLine = "LANGUAGE: write the hook, script, title, description and hashtags in " + lang + ".";
  const avoidLine = P.avoid ? "HARD RULE - never do or say this: " + P.avoid : "";

  const prompt = [
    "You are Nimbo, an elite content strategist for creators across all platforms (YouTube, Instagram, TikTok).",
    "A creator's niche / channel topic is: \"" + niche + "\".",
    creatorBlock,
    langLine,
    avoidLine,
    "The creator is making " + cfg.label + ". Produce a practical, ready-to-shoot content brief tailored to that format. Be specific and concrete to THIS niche — never generic filler.",
    "FORMAT LOCK: the creator chose \"" + cfg.ui + "\". The 'script' length and structure MUST match this format exactly — follow the length target strictly.",
    trendBlock,
    "",
    "Deliver:",
    "1) 'ideas': exactly 3 strong video ideas. Each has: 'title', 'hook' (a scroll-stopping first line said in the first 2 seconds), and 'why' (one sentence on why it will perform" + (trending.length ? ", referencing the current trend when relevant" : "") + ").",
    "2) 'best_pick_index': the index (0, 1 or 2) of the strongest idea.",
    "3) 'script': " + cfg.script + ". Write it the way the creator should actually deliver it.",
    "4) 'title': " + cfg.title + ".",
    "5) 'thumbnail_text': 2-4 HUGE punchy words for the thumbnail overlay (the hook compressed to a few words).",
    "6) 'thumbnail_image_prompt': a vivid, detailed prompt for an AI image generator to create a CLICK-WORTHY " + (platform === "youtube_long" ? "16:9 horizontal YouTube" : "9:16 vertical") + " thumbnail BACKGROUND. Describe ONE strong subject with exaggerated emotion (usually a close-up expressive human face), a bold simple high-contrast background, dramatic cinematic lighting, vivid saturated colors, ultra-detailed and professional. IMPORTANT: do NOT put any text, letters or words in the image — leave clear negative space (e.g. one side) for a text overlay.",
    "7) 'description': a 2-3 line caption/description ending with a call to action.",
    "8) 'hashtags': 8-12 relevant, specific hashtags (no '#' symbol, just the words)."
  ].join("\n");

  const maxTokens = platform === "youtube_long" ? 8192 : 4096;
  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: maxTokens, responseMimeType: "application/json", responseSchema: SCHEMA } };

  let lastErr = "Nimbo is a little busy right now. Please try again in a moment.";
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const brief = parseBrief(data);
        if (brief) {
          const out = { niche: niche, platform: platform, platformLabel: cfg.ui, brief: brief, trending: trending, grounded: trending.length > 0, trendSource: isYouTubePlatform ? "youtube_api" : "gemini_knowledge", model: model, createdAt: Date.now() };
          out.thumbUrl = buildThumbUrl(brief, niche, platform);
          return out;
        }
        lastErr = "Nimbo couldn't format the brief. Please try again.";
        continue;
      }
      const msg = (data && data.error && data.error.message) || "";
      const retryable = [429, 500, 502, 503].indexOf(r.status) !== -1 || /high demand|overload|unavailable|exhausted|rate/i.test(msg);
      lastErr = msg || lastErr;
      if (retryable) continue;
      throw new Error(msg || "The AI service returned an error.");
    } catch (e) {
      lastErr = (e && e.message) || lastErr;
      continue;
    }
  }
  throw new Error(lastErr);
}

module.exports = { generateBrief, getTrending, platformCfg, viewsShort, buildThumbUrl };
