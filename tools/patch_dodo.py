# -*- coding: utf-8 -*-
# Real Dodo Payments integration: checkout link -> pay -> verify -> activate plan.
import io

ROOT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/"

def rw(path, pairs):
    p = ROOT + path
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        assert old in s, "MISSING anchor in " + path + " -> " + old[:70]
        s = s.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    print("patched " + path)

# ---------- 1) store.js: attach Dodo product ids ----------
rw("functions/lib/store.js", [(
"""const PLANS = {
  starter: { id: "starter", name: "Starter", price: 19, videos: 30,  blurb: "1 video a day" },
  creator: { id: "creator", name: "Creator", price: 39, videos: 90,  blurb: "3 videos a day" },
  pro:     { id: "pro",     name: "Pro",     price: 79, videos: 300, blurb: "10 videos a day" }
};""",
"""const PLANS = {
  starter: { id: "starter", name: "Starter", price: 19, videos: 30,  blurb: "1 video a day",
             productId: process.env.DODO_PRODUCT_STARTER || "pdt_0NpTSSDgxXoi7ReQ62UVJ" },
  creator: { id: "creator", name: "Creator", price: 39, videos: 90,  blurb: "3 videos a day",
             productId: process.env.DODO_PRODUCT_CREATOR || "pdt_0NpTSNxiPATP4iAsyyUk7" },
  pro:     { id: "pro",     name: "Pro",     price: 79, videos: 300, blurb: "10 videos a day",
             productId: process.env.DODO_PRODUCT_PRO     || "pdt_0NpTSSjmqk3kiFYN1Axoj" }
};"""
)])

# ---------- 2) lib/dodo.js helper ----------
io.open(ROOT + "functions/lib/dodo.js", "w", encoding="utf-8").write('''// Dodo Payments helper. Test and live are completely separate hosts + keys.
function dodoHost() {
  return (process.env.DODO_MODE === "live") ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}
function dodoKey() { return process.env.DODO_API_KEY || ""; }

async function dodoFetch(path, options) {
  const opts = options || {};
  const r = await fetch(dodoHost() + path, {
    method: opts.method || "GET",
    headers: Object.assign({ "Authorization": "Bearer " + dodoKey(), "Content-Type": "application/json" }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let data = {};
  try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data: data };
}

module.exports = { dodoHost, dodoKey, dodoFetch };
''')
print("created functions/lib/dodo.js")

# ---------- 3) checkout.js ----------
io.open(ROOT + "functions/checkout.js", "w", encoding="utf-8").write('''// Starts a real Dodo subscription checkout and returns the payment link.
const { verifyToken, bearer } = require("./lib/auth");
const { getProfile, saveProfile, PLANS } = require("./lib/store");
const { dodoFetch, dodoKey } = require("./lib/dodo");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };
  if (!dodoKey()) return { statusCode: 500, headers, body: JSON.stringify({ error: "Payments are not configured yet." }) };

  let plan = "";
  try { plan = String((JSON.parse(event.body || "{}").plan) || ""); } catch (e) {}
  const P = PLANS[plan];
  if (!P || !P.productId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown plan." }) };

  const profile = (await getProfile(user.sub)) || {};
  const host = (event.headers && (event.headers["x-forwarded-host"] || event.headers.host)) || "nimbo-4sc3.netlify.app";
  const origin = "https://" + host;
  const cc = (profile.country && profile.country.length === 2) ? profile.country.toUpperCase() : "IN";

  const res = await dodoFetch("/subscriptions", { method: "POST", body: {
    product_id: P.productId,
    quantity: 1,
    payment_link: true,
    return_url: origin + "/app.html?checkout=done",
    customer: { email: user.email || "creator@nimbo.app", name: user.name || profile.creatorName || "Nimbo creator" },
    billing: { city: "NA", country: cc, state: "NA", street: "NA", zipcode: "000000" },
    metadata: { nimbo_sub: user.sub, plan: plan }
  }});

  if (!res.ok || !res.data.payment_link) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: res.data.message || "Could not start checkout. Please try again." }) };
  }

  profile.pendingSubscriptionId = res.data.subscription_id;
  profile.pendingPlan = plan;
  profile.updatedAt = Date.now();
  await saveProfile(user.sub, profile);

  return { statusCode: 200, headers, body: JSON.stringify({ payment_link: res.data.payment_link, subscription_id: res.data.subscription_id }) };
};
''')
print("created functions/checkout.js")

# ---------- 4) subscribe.js -> verify with Dodo, then activate ----------
io.open(ROOT + "functions/subscribe.js", "w", encoding="utf-8").write('''// Verifies the user's pending Dodo subscription and activates the plan ONLY if Dodo says it is paid.
const { verifyToken, bearer } = require("./lib/auth");
const { getProfile, saveProfile, PLANS } = require("./lib/store");
const { dodoFetch, dodoKey } = require("./lib/dodo");

const ACTIVE = ["active", "trialing"];

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  const profile = (await getProfile(user.sub)) || {};
  const subId = profile.pendingSubscriptionId || profile.subscriptionId;
  if (!subId) return { statusCode: 200, headers, body: JSON.stringify({ active: false, reason: "no_subscription" }) };
  if (!dodoKey()) return { statusCode: 500, headers, body: JSON.stringify({ error: "Payments are not configured yet." }) };

  const res = await dodoFetch("/subscriptions/" + encodeURIComponent(subId));
  if (!res.ok) return { statusCode: 502, headers, body: JSON.stringify({ active: false, error: "Could not check your payment." }) };

  const status = String(res.data.status || "").toLowerCase();
  if (ACTIVE.indexOf(status) === -1) {
    return { statusCode: 200, headers, body: JSON.stringify({ active: false, status: status }) };
  }

  const plan = profile.pendingPlan || profile.plan;
  if (!PLANS[plan]) return { statusCode: 200, headers, body: JSON.stringify({ active: false, reason: "unknown_plan" }) };

  profile.plan = plan;
  profile.planStatus = "active";
  profile.planStartedAt = profile.planStartedAt || Date.now();
  profile.subscriptionId = subId;
  profile.pendingSubscriptionId = null;
  profile.pendingPlan = null;
  profile.updatedAt = Date.now();
  await saveProfile(user.sub, profile);

  return { statusCode: 200, headers, body: JSON.stringify({ active: true, plan: plan, limit: PLANS[plan].videos }) };
};
''')
print("rewrote functions/subscribe.js (now verifies with Dodo)")

# ---------- 5) dodo-webhook.js (renewals / cancellations) ----------
io.open(ROOT + "functions/dodo-webhook.js", "w", encoding="utf-8").write('''// Dodo webhook (Standard Webhooks signature). Keeps plans in sync on renewal / cancel / failure.
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

  if (/subscription\\.(active|renewed)|payment\\.succeeded/.test(type)) {
    if (PLANS[plan]) {
      profile.plan = plan;
      profile.planStatus = "active";
      profile.planStartedAt = profile.planStartedAt || Date.now();
      profile.subscriptionId = data.subscription_id || profile.subscriptionId;
      profile.pendingSubscriptionId = null;
      profile.pendingPlan = null;
    }
  } else if (/subscription\\.(cancelled|canceled|expired|failed|on_hold)|payment\\.failed/.test(type)) {
    profile.planStatus = "inactive";
  }
  profile.updatedAt = Date.now();
  await saveProfile(sub, profile);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, type: type }) };
};
''')
print("created functions/dodo-webhook.js")
print("DODO BACKEND DONE")
