// Dodo webhook (Standard Webhooks signature). Keeps plans in sync on renewal / cancel / failure.
const crypto = require("crypto");
const { getProfile, saveProfile, PLANS } = require("./lib/store");

function verifySignature(event) {
  const secret = process.env.DODO_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const h = event.headers || {};
  const id = h["webhook-id"] || h["Webhook-Id"];
  const ts = h["webhook-timestamp"] || h["Webhook-Timestamp"];
  const sig = h["webhook-signature"] || h["Webhook-Signature"];
  if (!id || !ts || !sig) return false;
  // Reject old timestamps (5 min window)
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (!Number(ts) || age > 300) return false;
  const base = secret.replace(/^whsec_/, "");
  const keyBytes = Buffer.from(base, "base64");
  const signed = id + "." + ts + "." + (event.body || "");
  const expected = crypto.createHmac("sha256", keyBytes).update(signed).digest("base64");
  // header looks like: "v1,<sig> v1,<sig2>"
  const parts = String(sig).split(" ");
  for (let i = 0; i < parts.length; i++) {
    const got = parts[i].split(",")[1] || "";
    if (got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return true;
  }
  return false;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  if (!verifySignature(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: "bad signature" }) };

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch (e) {}
  const type = String(payload.type || "");
  const data = payload.data || {};
  const meta = data.metadata || {};
  const sub = meta.nimbo_sub;
  if (!sub) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ignored: "no nimbo_sub" }) };

  const profile = (await getProfile(sub)) || {};
  const plan = meta.plan || profile.pendingPlan || profile.plan;

  if (/subscription\.(active|renewed)|payment\.succeeded/.test(type)) {
    if (PLANS[plan]) {
      profile.plan = plan;
      profile.planStatus = "active";
      profile.planStartedAt = profile.planStartedAt || Date.now();
      profile.subscriptionId = data.subscription_id || profile.subscriptionId;
      profile.pendingSubscriptionId = null;
      profile.pendingPlan = null;
    }
  } else if (/subscription\.(cancelled|canceled|expired|failed|on_hold)|payment\.failed/.test(type)) {
    profile.planStatus = "inactive";
  }
  profile.updatedAt = Date.now();
  await saveProfile(sub, profile);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, type: type }) };
};
