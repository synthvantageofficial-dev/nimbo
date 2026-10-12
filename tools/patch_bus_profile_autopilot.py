# -*- coding: utf-8 -*-
# 1) profile.js: stop wiping server-managed fields (Telegram link, Dodo subscription ids),
#    map the creator's email to their account, and report channel + ledger state.
# 2) autopilot.js: respect the plan + monthly quota, and actually PUSH the result to the
#    creator's phone instead of only saving it.
import io

ROOT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/"

# ---------------------------------------------------------------- profile.js
P = ROOT + "functions/profile.js"
s = io.open(P, encoding="utf-8").read()

old_req = 'const { getProfile, saveProfile, getBriefs, getUsage, planLimit, PLANS, FOUNDING_DISCOUNT } = require("./lib/store");'
new_req = 'const { getProfile, saveProfile, getBriefs, getUsage, planLimit, PLANS, FOUNDING_DISCOUNT, getEvents, linkChannel } = require("./lib/store");'
assert old_req in s, "profile require"
s = s.replace(old_req, new_req, 1)

# GET: also return the connected channel + the action ledger, and map email -> account.
old_get = """    const [profile, briefs] = await Promise.all([getProfile(user.sub), getBriefs(user.sub)]);
    const limit = planLimit(profile && profile.plan);
    const usage = await getUsage(user.sub, limit);
    return { statusCode: 200, headers, body: JSON.stringify({
      user: { name: user.name, email: user.email, picture: user.picture },
      profile: profile, briefs: briefs, usage: usage,
      plans: PLANS, foundingDiscount: FOUNDING_DISCOUNT
    }) };"""
new_get = """    const [profile, briefs, events] = await Promise.all([getProfile(user.sub), getBriefs(user.sub), getEvents(user.sub)]);
    const limit = planLimit(profile && profile.plan);
    const usage = await getUsage(user.sub, limit);
    // Recognise this creator when they email Nimbo from this address.
    if (user.email) await linkChannel("email", user.email, user.sub).catch(function () {});
    const tg = (profile && profile.telegram) || null;
    return { statusCode: 200, headers, body: JSON.stringify({
      user: { name: user.name, email: user.email, picture: user.picture },
      profile: profile, briefs: briefs, usage: usage, events: events,
      channels: { telegram: tg ? { connected: true, username: tg.username || "" } : { connected: false } },
      plans: PLANS, foundingDiscount: FOUNDING_DISCOUNT
    }) };"""
assert old_get in s, "profile GET block"
s = s.replace(old_get, new_get, 1)

# POST: never lose fields only the server is allowed to set.
old_sub = """      // --- subscription (set by /subscribe, never by the client directly) ---
      plan:          e0.plan || "",
      planStatus:    e0.planStatus || "",
      planStartedAt: e0.planStartedAt || null,"""
new_sub = """      // --- subscription (set by /subscribe, never by the client directly) ---
      plan:          e0.plan || "",
      planStatus:    e0.planStatus || "",
      planStartedAt: e0.planStartedAt || null,
      subscriptionId:        e0.subscriptionId || null,
      pendingSubscriptionId: e0.pendingSubscriptionId || null,
      pendingPlan:           e0.pendingPlan || null,

      // --- connected channels (set when the creator pairs Telegram, never by this form) ---
      telegram:      e0.telegram || null,"""
assert old_sub in s, "profile subscription block"
s = s.replace(old_sub, new_sub, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("patched functions/profile.js")

# ---------------------------------------------------------------- autopilot.js
A = ROOT + "functions/lib/autopilot.js"
io.open(A, "w", encoding="utf-8").write('''// Autopilot: Nimbo working on its own, with nobody watching.
// For every creator who turned it on, it researches, creates, logs it, and SENDS it to them.
const { generateBrief } = require("./engine");
const { getProfile, addBrief, getUsage, incUsage, planLimit, addEvent } = require("./store");
const { formatBrief } = require("./agent");
const { deliver } = require("./channels");

const NL = String.fromCharCode(10);

// Only create for creators who are actually paying and still have quota left.
async function canRun(sub, profile) {
  const plan = profile.plan || "";
  const limit = planLimit(plan);
  if (!plan || !limit) return { ok: false, why: "no_plan" };
  if (profile.planStatus && profile.planStatus !== "active") return { ok: false, why: "plan_" + profile.planStatus };
  const u = await getUsage(sub, limit);
  if (u.count >= limit) return { ok: false, why: "quota_used" };
  return { ok: true, limit: limit, used: u.count };
}

async function runAutopilot(maxUsers) {
  maxUsers = maxUsers || 50;
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "nimbo", siteID: process.env.NIMBO_SITE_ID, token: process.env.NIMBO_BLOBS_TOKEN });

  let listing;
  try { listing = await store.list({ prefix: "profile/" }); }
  catch (e) { return { processed: 0, delivered: 0, error: "list failed" }; }

  const keys = (listing && listing.blobs ? listing.blobs : []).map((b) => b.key);
  let processed = 0, delivered = 0, skipped = 0, pushed = 0;

  for (let i = 0; i < keys.length && processed < maxUsers; i++) {
    const sub = keys[i].replace(/^profile\\//, "");
    processed++;
    let profile;
    try { profile = await getProfile(sub); } catch (e) { continue; }
    if (!profile || !profile.autopilot || !profile.niche) { skipped++; continue; }

    const gate = await canRun(sub, profile);
    if (!gate.ok) { skipped++; continue; }

    try {
      const out = await generateBrief({ niche: profile.niche, platform: profile.platform || "short", brand: profile.brand || "", profile: profile });
      out.auto = true;
      out.source = "autopilot";
      await addBrief(sub, out);
      const used = await incUsage(sub).catch(() => gate.used + 1);
      delivered++;

      const title = (out.brief && out.brief.title) || profile.niche;
      await addEvent(sub, "content", "Autopilot made \\"" + title + "\\"", { platform: out.platform, auto: true });

      // The whole point: the creator did nothing and the work shows up on their phone.
      const intro = "🤖 Nimbo here - tum busy the, maine ye bana diya:" + NL;
      const tail = NL + NL + "(" + Math.max(0, gate.limit - used) + " videos left this month)";
      const where = await deliver(sub, intro + formatBrief(out) + tail, { profile: profile, channel: "telegram" });
      if (where === "telegram") pushed++;
    } catch (e) { /* one creator failing must never stop the rest */ }
  }
  return { processed: processed, delivered: delivered, pushed: pushed, skipped: skipped };
}

module.exports = { runAutopilot };
''')
print("rewrote functions/lib/autopilot.js (plan-aware + pushes to the creator)")
