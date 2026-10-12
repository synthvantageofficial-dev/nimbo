// Verifies the user's pending Dodo subscription and activates the plan ONLY if Dodo says it is paid.
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
