// POST { url } → detect platform → fetch channel info → Gemini niche guess
// Returns { platform, handle, name, subscribers, thumbnail, description, niche_hint, url }
const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Nimbo/1.0)" } }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function extractOg(html, prop) {
  let m = html.match(new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]+content=["\']([^"\']*)["\']', "i"));
  if (!m) m = html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']' + prop + '["\']', "i"));
  return m ? m[1] : "";
}

function parseYoutubeHandle(url) {
  let m = url.match(/youtube\.com\/@([^/?&\s]+)/i);
  if (m) return { type: "handle", value: "@" + m[1] };
  m = url.match(/youtube\.com\/channel\/([^/?&\s]+)/i);
  if (m) return { type: "channelId", value: m[1] };
  m = url.match(/youtube\.com\/(?:user|c)\/([^/?&\s]+)/i);
  if (m) return { type: "username", value: m[1] };
  return null;
}

async function fetchYoutubeChannel(url, apiKey) {
  const parsed = parseYoutubeHandle(url);
  if (!parsed) return null;
  let apiUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=" + encodeURIComponent(apiKey);
  if (parsed.type === "handle") apiUrl += "&forHandle=" + encodeURIComponent(parsed.value);
  else if (parsed.type === "channelId") apiUrl += "&id=" + encodeURIComponent(parsed.value);
  else apiUrl += "&forUsername=" + encodeURIComponent(parsed.value);
  const res = await httpsGet(apiUrl);
  if (res.status !== 200) return null;
  let data;
  try { data = JSON.parse(res.body); } catch (e) { return null; }
  if (!data.items || !data.items.length) return null;
  const ch = data.items[0];
  const sn = ch.snippet || {};
  const st = ch.statistics || {};
  const thumbs = sn.thumbnails || {};
  const thumb = (thumbs.medium || thumbs.default || thumbs.high || {}).url || "";
  return {
    platform: "youtube",
    handle: "@" + (sn.customUrl || parsed.value).replace(/^@/, ""),
    name: sn.title || "",
    subscribers: parseInt(st.subscriberCount || "0", 10),
    thumbnail: thumb,
    description: (sn.description || "").slice(0, 500)
  };
}

async function fetchSocialChannel(platform, url) {
  let handle = "";
  if (platform === "instagram") {
    const m = url.match(/instagram\.com\/([^/?&\s]+)/i);
    handle = m ? m[1].replace(/^@/, "") : "";
  } else if (platform === "tiktok") {
    const m = url.match(/tiktok\.com\/@?([^/?&\s]+)/i);
    handle = m ? m[1].replace(/^@/, "") : "";
  } else if (platform === "facebook") {
    const m = url.match(/facebook\.com\/([^/?&\s]+)/i);
    handle = m ? m[1] : "";
  }
  try {
    const res = await httpsGet(url);
    if (res.status !== 200) return { platform, handle, name: handle, subscribers: 0, thumbnail: "", description: "" };
    const html = res.body;
    const name = extractOg(html, "og:title") || handle;
    const description = extractOg(html, "og:description") || "";
    const thumbnail = extractOg(html, "og:image") || "";
    return { platform, handle, name, subscribers: 0, thumbnail, description: description.slice(0, 500) };
  } catch (e) {
    return { platform, handle, name: handle, subscribers: 0, thumbnail: "", description: "" };
  }
}

async function guessNiche(description, name, platform) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || !description) return "";
  const prompt = 'Channel name: "' + name + '". Platform: ' + platform + '. Description: "' + description.slice(0, 300) + '". In 5 words or less, what is this channel\'s niche? Reply with ONLY the niche, no punctuation.';
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 20, temperature: 0.1 }
  });
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + encodeURIComponent(geminiKey);
  return new Promise((resolve) => {
    const req = https.request(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          const text = ((j.candidates || [])[0] || {}).content;
          const t = text && text.parts && text.parts[0] && text.parts[0].text || "";
          resolve(t.trim().slice(0, 60));
        } catch (e) { resolve(""); }
      });
    });
    req.on("error", () => resolve(""));
    req.setTimeout(8000, () => { req.destroy(); resolve(""); });
    req.write(body);
    req.end();
  });
}

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook";
  return null;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  let d = {};
  try { d = JSON.parse(event.body || "{}"); } catch (e) {}
  let url = (d.url || "").trim();
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: "url is required" }) };
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const platform = detectPlatform(url);
  if (!platform) return { statusCode: 400, headers, body: JSON.stringify({ error: "unsupported_platform", message: "Paste a YouTube, Instagram, TikTok, or Facebook channel URL." }) };
  let info = null;
  if (platform === "youtube") {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "no_key" }) };
    info = await fetchYoutubeChannel(url, apiKey);
    if (!info) return { statusCode: 404, headers, body: JSON.stringify({ error: "not_found", message: "Could not find that YouTube channel. Check the URL." }) };
  } else {
    info = await fetchSocialChannel(platform, url);
  }
  const niche_hint = await guessNiche(info.description, info.name, platform);
  return { statusCode: 200, headers, body: JSON.stringify(Object.assign({}, info, { niche_hint: niche_hint, url: url })) };
};
