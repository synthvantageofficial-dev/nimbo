// Free image proxy — Pollinations (no key). Returns a JPEG for the given prompt + size.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const prompt = (q.prompt || "").toString().slice(0, 480);
  if (!prompt) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "no prompt" }) };
  let w = parseInt(q.w, 10) || 768; let h = parseInt(q.h, 10) || 1024;
  if (w > 1280) w = 1280; if (h > 1024) h = 1024; // free-tier friendly caps
  const seed = parseInt(q.seed, 10) || 1;
  try {
    const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=" + w + "&height=" + h + "&nologo=true&model=flux&seed=" + seed;
    const r = await fetch(url);
    if (!r.ok) return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "image failed" }) };
    const ab = await r.arrayBuffer();
    return {
      statusCode: 200,
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" },
      body: Buffer.from(ab).toString("base64"),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "image error" }) };
  }
};
