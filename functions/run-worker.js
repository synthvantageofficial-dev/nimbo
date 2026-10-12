// Plain HTTP worker trigger — the safety net.
// Use it from an external cron (cron-job.org, every minute) so the queue always drains
// even if Netlify background functions or scheduled functions are unavailable.
const { drain } = require("./lib/worker");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const want = process.env.ADMIN_SECRET || "";
  const h = event.headers || {};
  const got = h["x-admin-secret"] || h["X-Admin-Secret"] || ((event.queryStringParameters || {}).key) || "";
  if (want && got !== want) return { statusCode: 401, headers, body: JSON.stringify({ error: "unauthorized" }) };

  let max = 3;
  const q = event.queryStringParameters || {};
  if (q.max) max = Math.max(1, Math.min(5, parseInt(q.max, 10) || 3));

  try {
    const out = await drain(max);
    return { statusCode: 200, headers, body: JSON.stringify(Object.assign({ ok: true }, out)) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: (e && e.message) || "failed" }) };
  }
};
