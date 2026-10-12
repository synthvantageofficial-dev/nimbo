// Inbound EMAIL -> the same agent loop. The creator just emails Nimbo and the work gets done.
// Provider-agnostic: point any inbound-email webhook (Cloudflare Email Routing worker,
// Mailgun route, Resend inbound, SendGrid parse) at:
//   POST /.netlify/functions/email-in?key=<EMAIL_IN_SECRET>
// It reads the sender from whatever field the provider uses.
const S = require("./lib/store");
const { kick } = require("./lib/worker");

function firstOf(obj, keys) {
  for (let i = 0; i < keys.length; i++) {
    const v = obj[keys[i]];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
}

// "Name <a@b.com>" -> "a@b.com"
function addressOf(raw) {
  const m = String(raw || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : "";
}

// Strip quoted replies and signatures so Nimbo reads only what was actually written.
function cleanBody(text) {
  let t = String(text || "").replace(/\r/g, "");
  const cuts = [/^On .* wrote:$/m, /^-{2,}\s*$/m, /^_{3,}\s*$/m, /^From:\s/m, /^>+/m, /^Sent from /m];
  for (let i = 0; i < cuts.length; i++) {
    const m = t.match(cuts[i]);
    if (m && m.index > 20) t = t.slice(0, m.index);
  }
  return t.trim().slice(0, 1500);
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const want = process.env.EMAIL_IN_SECRET || "";
  if (want) {
    const h = event.headers || {};
    const got = h["x-email-secret"] || ((event.queryStringParameters || {}).key) || "";
    if (got !== want) return { statusCode: 401, headers, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let d = {};
  try { d = JSON.parse(event.body || "{}"); } catch (e) {
    // Some providers post form-encoded instead of JSON.
    try {
      const params = new URLSearchParams(event.body || "");
      d = {}; params.forEach(function (v, k) { d[k] = v; });
    } catch (e2) { return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ignored: "unparsable" }) }; }
  }

  const from = addressOf(firstOf(d, ["from", "sender", "From", "envelope_from", "fromAddress"]));
  const subject = firstOf(d, ["subject", "Subject"]).slice(0, 200);
  const body = cleanBody(firstOf(d, ["text", "plain", "body", "text-plain", "stripped-text", "TextBody"]));

  if (!from) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ignored: "no_sender" }) };

  const sub = await S.subForChannel("email", from);
  if (!sub) {
    // Unknown sender — ignore silently (never auto-reply to strangers; that is how you get spam-listed).
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ignored: "unknown_sender" }) };
  }

  const text = [subject, body].filter(Boolean).join(" — ").slice(0, 1600);
  if (!text) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ignored: "empty" }) };

  await S.queueTask({ sub: sub, text: text, channel: "email", from: from });
  await S.addEvent(sub, "inbox", "Email received: " + (subject || "(no subject)"));
  await kick(event);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, queued: true }) };
};
