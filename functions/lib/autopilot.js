// Autopilot: Nimbo working on its own, with nobody watching.
// For every creator who turned it on, it researches, creates, logs it, and SENDS it to them.
const { generateBrief } = require("./engine");
const { getProfile, addBrief, getUsage, incUsage, planLimit, addEvent } = require("./store");
const { formatBrief, renderVideoFor } = require("./agent");
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
    const sub = keys[i].replace(/^profile\//, "");
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
      // The whole promise: a finished video waiting for them, made while they were away.
      await renderVideoFor(sub, out, profile, profile.platform || "short");
      await addBrief(sub, out);
      const used = await incUsage(sub).catch(() => gate.used + 1);
      delivered++;

      const title = (out.brief && out.brief.title) || profile.niche;
      await addEvent(sub, "content", "Autopilot made \"" + title + "\"", { platform: out.platform, auto: true });

      // The whole point: the creator did nothing and the work shows up on their phone.
      const intro = "🤖 Nimbo here - you were busy, so I made this for you:" + NL;
      const vline = out.video ? (NL + "🎥 Video ready: " + out.video.seconds + "s, " + out.video.scenes + " scenes.") : "";
      const tail = NL + NL + "(" + Math.max(0, gate.limit - used) + " videos left this month)";
      const where = await deliver(sub, intro + formatBrief(out) + vline + tail, {
        profile: profile, channel: "telegram",
        videoId: out.video ? out.video.id : null, videoCaption: title
      });
      if (where === "telegram") pushed++;
    } catch (e) { /* one creator failing must never stop the rest */ }
  }
  return { processed: processed, delivered: delivered, pushed: pushed, skipped: skipped };
}

module.exports = { runAutopilot };
