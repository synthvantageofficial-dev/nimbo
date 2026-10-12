// Queue a free faceless video render for a brief the creator already has.
// POST { script, platform, voice }  ->  { taskId }
// The worker picks this up, renders the video, and stores the result.
// The app polls ask.js?taskId=... to know when it's done.
const { verifyToken, bearer } = require("./lib/auth");
const S = require("./lib/store");
const { kick } = require("./lib/worker");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  let script = "", platform = "short", voice = "en-US-AriaNeural";
  try {
    const b = JSON.parse(event.body || "{}");
    script = String(b.script || "").trim().slice(0, 8000);
    if (b.platform) platform = String(b.platform).slice(0, 40);
    if (b.voice) voice = String(b.voice).slice(0, 60);
  } catch (e) {}

  if (!script) return { statusCode: 400, headers, body: JSON.stringify({ error: "No script to build from." }) };

  const task = await S.queueTask({ type: "render_video", sub: user.sub, script, platform, voice });
  await kick(event);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, taskId: task.id }) };
};
