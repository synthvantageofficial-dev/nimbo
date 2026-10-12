// Nimbo Content Engine — HTTP endpoint (auth + daily limit + save). Core logic lives in lib/engine.
const { verifyToken, bearer } = require("./lib/auth");
const { getProfile, addBrief, getUsage, incUsage, planLimit, PLANS } = require("./lib/store");
const { generateBrief } = require("./lib/engine");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in to use Nimbo." }) };

  let niche = "", platform = "short";
  try { const pb = JSON.parse(event.body || "{}"); niche = (pb.niche || "").toString().trim(); if (pb.platform) platform = String(pb.platform); } catch (e) {}
  if (!niche) return { statusCode: 400, headers, body: JSON.stringify({ error: "Please tell Nimbo your niche or channel topic." }) };

  // --- subscription gate ---
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
  const brand = profile && profile.brand ? profile.brand : "";

  try {
    const out = await generateBrief({ niche: niche, platform: platform, brand: brand, profile: profile });
    const newCount = await incUsage(user.sub).catch(() => u.count + 1);
    await addBrief(user.sub, out).catch(() => {});
    return { statusCode: 200, headers, body: JSON.stringify(Object.assign({}, out, { usage: { month: u.month, count: newCount, limit: limit } })) };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: (e && e.message) || "Nimbo had trouble. Please try again." }) };
  }
};
