// Starts a real Dodo subscription checkout and returns the payment link.
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
