// Web chat into the same agent loop as Telegram/email — one brain, one queue, every channel.
// POST { text }            -> queues the request, returns { taskId }
// GET  ?taskId=...         -> { status, reply } once the worker is done
// GET  (no taskId)         -> the recent conversation, so the app can show Nimbo's messages
const { verifyToken, bearer } = require("./lib/auth");
const S = require("./lib/store");
const { kick } = require("./lib/worker");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  if (event.httpMethod === "GET") {
    const q = event.queryStringParameters || {};
    if (q.taskId) {
      const t = await S.getTask(q.taskId);
      if (!t || t.sub !== user.sub) return { statusCode: 404, headers, body: JSON.stringify({ error: "not found" }) };
      return { statusCode: 200, headers, body: JSON.stringify({
        status: t.status, intent: t.intent || "", error: t.error || "",
        heard: t.heard || "", reply: t.reply || "",
        videoUrl: t.videoUrl || "", video: t.video || null, step: t.step || ""
      }) };
    }
    const conv = await S.getConv(user.sub);
    const events = await S.getEvents(user.sub);
    return { statusCode: 200, headers, body: JSON.stringify({ conv: conv, events: events }) };
  }

  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let text = "";
  try { text = String((JSON.parse(event.body || "{}").text) || "").trim().slice(0, 1500); } catch (e) {}
  if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: "Say something." }) };

  const task = await S.queueTask({ sub: user.sub, text: text, channel: "web" });
  await kick(event);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, taskId: task.id }) };
};
