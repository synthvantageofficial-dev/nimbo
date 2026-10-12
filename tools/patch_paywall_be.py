# -*- coding: utf-8 -*-
# Paywall backend: plans, monthly quota, subscription state, subscribe endpoint.
import io, sys

ROOT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/"

def rw(path, pairs):
    p = ROOT + path
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        assert old in s, "MISSING anchor in " + path + " -> " + old[:70]
        s = s.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    print("patched " + path)

# ---------------- 1) store.js : PLANS + monthly usage ----------------
rw("functions/lib/store.js", [
(
"const FREE_DAILY_LIMIT = 10;",
"""const FREE_DAILY_LIMIT = 10; // legacy fallback

// Subscription plans (monthly video/brief quota).
const PLANS = {
  starter: { id: "starter", name: "Starter", price: 19, videos: 30,  blurb: "1 video a day" },
  creator: { id: "creator", name: "Creator", price: 39, videos: 90,  blurb: "3 videos a day" },
  pro:     { id: "pro",     name: "Pro",     price: 79, videos: 300, blurb: "10 videos a day" }
};
const FOUNDING_DISCOUNT = 0.30; // first 1000 creators - 30% off for life
function planLimit(plan) { return (PLANS[plan] && PLANS[plan].videos) || 0; }
function monthKey() { return new Date().toISOString().slice(0, 7); }"""
),
(
"""async function getUsage(sub, limit) {
  const u = await getJSON("usage/" + sub, { date: "", count: 0 });
  const t = today();
  if (u.date !== t) { u.date = t; u.count = 0; }
  return { date: u.date, count: u.count, limit: limit };
}
async function incUsage(sub) {
  const key = "usage/" + sub;
  const u = await getJSON(key, { date: "", count: 0 });
  const t = today();
  if (u.date !== t) { u.date = t; u.count = 0; }
  u.count += 1;
  await setJSON(key, u);
  return u.count;
}""",
"""async function getUsage(sub, limit) {
  const u = await getJSON("usage/" + sub, { month: "", count: 0 });
  const m = monthKey();
  if (u.month !== m) { u.month = m; u.count = 0; }
  return { month: u.month, count: u.count, limit: limit };
}
async function incUsage(sub) {
  const key = "usage/" + sub;
  const u = await getJSON(key, { month: "", count: 0 });
  const m = monthKey();
  if (u.month !== m) { u.month = m; u.count = 0; }
  u.count += 1;
  await setJSON(key, u);
  return u.count;
}"""
),
(
"module.exports = { getProfile, saveProfile, getBriefs, addBrief, getUsage, incUsage, today, FREE_DAILY_LIMIT };",
"module.exports = { getProfile, saveProfile, getBriefs, addBrief, getUsage, incUsage, today, monthKey, FREE_DAILY_LIMIT, PLANS, FOUNDING_DISCOUNT, planLimit };"
),
])

# ---------------- 2) profile.js : plan fields + plan-aware usage ----------------
rw("functions/profile.js", [
(
'const { getProfile, saveProfile, getBriefs, getUsage, FREE_DAILY_LIMIT } = require("./lib/store");',
'const { getProfile, saveProfile, getBriefs, getUsage, planLimit, PLANS, FOUNDING_DISCOUNT } = require("./lib/store");'
),
(
"""    const [profile, briefs, usage] = await Promise.all([getProfile(user.sub), getBriefs(user.sub), getUsage(user.sub, FREE_DAILY_LIMIT)]);
    return { statusCode: 200, headers, body: JSON.stringify({
      user: { name: user.name, email: user.email, picture: user.picture },
      profile: profile, briefs: briefs, usage: usage
    }) };""",
"""    const [profile, briefs] = await Promise.all([getProfile(user.sub), getBriefs(user.sub)]);
    const limit = planLimit(profile && profile.plan);
    const usage = await getUsage(user.sub, limit);
    return { statusCode: 200, headers, body: JSON.stringify({
      user: { name: user.name, email: user.email, picture: user.picture },
      profile: profile, briefs: briefs, usage: usage,
      plans: PLANS, foundingDiscount: FOUNDING_DISCOUNT
    }) };"""
),
(
"""      onboarded:   ("onboarded" in d) ? b(d.onboarded) : b(e0.onboarded),""",
"""      // --- subscription (set by /subscribe, never by the client directly) ---
      plan:          e0.plan || "",
      planStatus:    e0.planStatus || "",
      planStartedAt: e0.planStartedAt || null,

      onboarded:   ("onboarded" in d) ? b(d.onboarded) : b(e0.onboarded),"""
),
])

# ---------------- 3) generate-brief.js : plan gate + monthly quota ----------------
rw("functions/generate-brief.js", [
(
'const { getProfile, addBrief, getUsage, incUsage, FREE_DAILY_LIMIT } = require("./lib/store");',
'const { getProfile, addBrief, getUsage, incUsage, planLimit, PLANS } = require("./lib/store");'
),
(
"""  const u = await getUsage(user.sub, FREE_DAILY_LIMIT);
  if (u.count >= FREE_DAILY_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "You've used all " + FREE_DAILY_LIMIT + " briefs for today. Come back tomorrow — higher limits are coming soon.", usage: u }) };
  }

  const profile = await getProfile(user.sub);
  const brand = profile && profile.brand ? profile.brand : "";""",
"""  // --- subscription gate ---
  const profile = await getProfile(user.sub);
  const plan = (profile && profile.plan) || "";
  const limit = planLimit(plan);
  const active = plan && limit && (!profile.planStatus || profile.planStatus === "active");
  if (!active) {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Choose a plan to start creating with Nimbo.", needPlan: true }) };
  }
  const u = await getUsage(user.sub, limit);
  if (u.count >= limit) {
    const nm = (PLANS[plan] && PLANS[plan].name) || plan;
    return { statusCode: 429, headers, body: JSON.stringify({ error: "You have used all " + limit + " videos in your " + nm + " plan this month. Upgrade for more.", usage: u, needUpgrade: true }) };
  }
  const brand = profile && profile.brand ? profile.brand : "";"""
),
(
"""    return { statusCode: 200, headers, body: JSON.stringify(Object.assign({}, out, { usage: { date: u.date, count: newCount, limit: FREE_DAILY_LIMIT } })) };""",
"""    return { statusCode: 200, headers, body: JSON.stringify(Object.assign({}, out, { usage: { month: u.month, count: newCount, limit: limit } })) };"""
),
])

# ---------------- 4) subscribe.js : set the user's plan ----------------
sub_js = """// Subscription endpoint. TEST MODE: activates the chosen plan immediately.
// When a payment provider is connected, verify the payment here BEFORE activating.
const { verifyToken, bearer } = require("./lib/auth");
const { getProfile, saveProfile, PLANS } = require("./lib/store");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  let plan = "";
  try { plan = String((JSON.parse(event.body || "{}").plan) || ""); } catch (e) {}
  if (!PLANS[plan]) return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown plan." }) };

  const p = (await getProfile(user.sub)) || {};
  p.plan = plan;
  p.planStatus = "active";                 // <-- real payment verification goes here
  p.planStartedAt = p.planStartedAt || Date.now();
  p.updatedAt = Date.now();
  await saveProfile(user.sub, p);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, plan: plan, planStatus: "active", limit: PLANS[plan].videos, testMode: true }) };
};
"""
io.open(ROOT + "functions/subscribe.js", "w", encoding="utf-8").write(sub_js)
print("created functions/subscribe.js")
print("BACKEND PAYWALL DONE")
