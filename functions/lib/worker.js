// The worker: takes queued requests off the bus, does the real work, delivers the answer.
// Inbound channels stay instant because the slow part (AI generation) happens here.
const S = require("./store");
const { handleMessage } = require("./agent");
const { deliver } = require("./channels");

async function runTask(task) {
  if (!task || !task.id) return { ok: false, error: "no_task" };
  await S.updateTask(task.id, { status: "working" });
  try {
    const out = await handleMessage({
      sub: task.sub,
      text: task.text || "",
      audio: task.audio || null,
      channel: task.channel || "chat"
    });
    const vid = (out.brief && out.brief.video) ? out.brief.video.id : null;
    const where = await deliver(task.sub, out.reply, {
      channel: task.channel || "telegram",
      videoId: vid,
      videoCaption: (out.brief && out.brief.brief && out.brief.brief.title) || ""
    });
    await S.updateTask(task.id, { status: "done", intent: out.intent, deliveredTo: where, audio: null, reply: String(out.reply || "").slice(0, 8000), heard: out.heard || "" });
    return { ok: true, intent: out.intent, deliveredTo: where };
  } catch (e) {
    const msg = (e && e.message) || "failed";
    await S.updateTask(task.id, { status: "error", error: msg, audio: null });
    try { await deliver(task.sub, "Sorry, I couldn't finish that: " + msg + " — please ask me again in a moment."); } catch (e2) {}
    return { ok: false, error: msg };
  }
}

// Drain the queue. Keep `max` small so one invocation always finishes in time.
async function drain(max) {
  const tasks = await S.listQueuedTasks(max || 5);
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    results.push(await runTask(tasks[i]));
  }
  return { picked: tasks.length, results: results };
}

// Fire the background worker so a queued task starts within a second.
// Background functions answer 202 instantly, so this never slows the webhook down.
async function kick(event) {
  try {
    const h = (event && event.headers) || {};
    const host = h["x-forwarded-host"] || h.host;
    if (!host) return false;
    const proto = /localhost|127\.0\.0\.1/.test(host) ? "http" : "https";
    await fetch(proto + "://" + host + "/.netlify/functions/worker-background", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
    });
    return true;
  } catch (e) { return false; }
}

module.exports = { runTask, drain, kick };
