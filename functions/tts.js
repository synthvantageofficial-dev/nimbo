// Free voiceover proxy — Google Translate TTS (no key). Chunks long text, returns one MP3.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  let text = (q.text || "").toString().replace(/\s+/g, " ").trim().slice(0, 1600);
  if (!text) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "no text" }) };

  // split into <=180 char chunks on word boundaries (Google TTS limit)
  const chunks = [];
  let s = text;
  while (s.length) {
    if (s.length <= 180) { chunks.push(s); break; }
    let cut = s.lastIndexOf(" ", 180);
    if (cut < 1) cut = 180;
    chunks.push(s.slice(0, cut).trim());
    s = s.slice(cut).trim();
  }

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=" + encodeURIComponent(chunks[i]);
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!r.ok) continue;
      const ab = await r.arrayBuffer();
      parts.push(Buffer.from(ab));
    } catch (e) { /* skip chunk */ }
  }
  if (!parts.length) return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "tts failed" }) };

  const out = Buffer.concat(parts);
  return {
    statusCode: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" },
    body: out.toString("base64"),
    isBase64Encoded: true
  };
};
