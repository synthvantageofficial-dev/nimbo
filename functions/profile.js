// GET  -> signed-in user + full profile + saved briefs + usage.
// POST -> saves/merges the creator's full setup profile (onboarding).
const { verifyToken, bearer } = require("./lib/auth");
const { getProfile, saveProfile, getBriefs, getUsage, planLimit, PLANS, FOUNDING_DISCOUNT, getEvents, linkChannel } = require("./lib/store");

function s(v, max) { return (v == null ? "" : String(v)).slice(0, max || 200); }
function arr(v, maxItems, itemMax) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems || 12).map(function (x) { return s(x, itemMax || 60); }).filter(Boolean);
}
function b(v) { return !!v; }
function pick(data, existing, key, fn) { return (key in data) ? fn(data[key]) : (existing[key] !== undefined ? existing[key] : fn(undefined)); }

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const user = await verifyToken(bearer(event));
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in." }) };

  if (event.httpMethod === "GET") {
    const [profile, briefs, events] = await Promise.all([getProfile(user.sub), getBriefs(user.sub), getEvents(user.sub)]);
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
    }) };
  }

  if (event.httpMethod === "POST") {
    let d = {};
    try { d = JSON.parse(event.body || "{}"); } catch (e) {}
    const e0 = (await getProfile(user.sub)) || {};

    const p = {
      // --- 1. You & your channel ---
      creatorName: pick(d, e0, "creatorName", function (v) { return s(v, 80); }),
      niche:       pick(d, e0, "niche",       function (v) { return s(v, 150); }),
      subTopics:   pick(d, e0, "subTopics",   function (v) { return arr(v, 10, 60); }),
      audience:    pick(d, e0, "audience",    function (v) { return s(v, 300); }),
      language:    pick(d, e0, "language",    function (v) { return s(v, 40) || "English"; }),
      country:     pick(d, e0, "country",     function (v) { return s(v, 60); }),

      // --- 2. Platforms ---
      platforms:   pick(d, e0, "platforms",   function (v) { return arr(v, 8, 30); }),
      platform:    pick(d, e0, "platform",    function (v) { return s(v, 30) || "short"; }), // default format for briefs
      links:       (function () {
        const src = ("links" in d) ? (d.links || {}) : (e0.links || {});
        return { youtube: s(src.youtube, 200), instagram: s(src.instagram, 200), tiktok: s(src.tiktok, 200) };
      })(),
      channels:    (function () {
        const src = ("channels" in d) ? (d.channels || []) : (e0.channels || []);
        if (!Array.isArray(src)) return [];
        return src.slice(0, 10).map(function (ch) {
          if (!ch || typeof ch !== "object") return null;
          return {
            platform: s(ch.platform, 30),
            handle: s(ch.handle, 100),
            name: s(ch.name, 150),
            subscribers: Number(ch.subscribers) || 0,
            thumbnail: s(ch.thumbnail, 300),
            description: s(ch.description, 500),
            niche_hint: s(ch.niche_hint, 80),
            url: s(ch.url, 300)
          };
        }).filter(Boolean);
      })(),
      size:        pick(d, e0, "size",        function (v) { return s(v, 40); }),

      // --- 3. Style & voice (Nimbo's memory) ---
      tone:        pick(d, e0, "tone",        function (v) { return arr(v, 8, 40); }),
      onCamera:    pick(d, e0, "onCamera",    function (v) { return s(v, 20) || "faceless"; }),
      videoStyle:  pick(d, e0, "videoStyle",  function (v) { return s(v, 60); }),
      brand:       pick(d, e0, "brand",       function (v) { return s(v, 600); }),
      avoid:       pick(d, e0, "avoid",       function (v) { return s(v, 400); }),
      inspirations:pick(d, e0, "inspirations",function (v) { return s(v, 300); }),

      // --- 4. Posting plan ---
      frequency:   pick(d, e0, "frequency",   function (v) { return s(v, 30); }),
      postDays:    pick(d, e0, "postDays",    function (v) { return arr(v, 7, 12); }),
      postTime:    pick(d, e0, "postTime",    function (v) { return s(v, 20); }),

      // --- 5. Video production (BYOK) ---
      videoTool:   pick(d, e0, "videoTool",   function (v) { return s(v, 40) || "free_faceless"; }),
      videoToolKey:pick(d, e0, "videoToolKey",function (v) { return s(v, 300); }),
      voicePref:   pick(d, e0, "voicePref",   function (v) { return s(v, 60); }),
      captionStyle:pick(d, e0, "captionStyle",function (v) { return s(v, 40); }),
      music:       pick(d, e0, "music",       function (v) { return s(v, 60); }),

      // --- 6. Automation ---
      automation:  pick(d, e0, "automation",  function (v) { return s(v, 20) || "approve_first"; }),
      permissions: (function () {
        const src = ("permissions" in d) ? (d.permissions || {}) : (e0.permissions || {});
        return { ideas: b(src.ideas), video: b(src.video), schedule: b(src.schedule), post: b(src.post), comments: b(src.comments) };
      })(),
      autopilot:   ("autopilot" in d) ? b(d.autopilot) : b(e0.autopilot),

      // --- subscription (set by /subscribe, never by the client directly) ---
      plan:          e0.plan || "",
      planStatus:    e0.planStatus || "",
      planStartedAt: e0.planStartedAt || null,
      subscriptionId:        e0.subscriptionId || null,
      pendingSubscriptionId: e0.pendingSubscriptionId || null,
      pendingPlan:           e0.pendingPlan || null,

      // --- connected channels (set when the creator pairs Telegram, never by this form) ---
      telegram:      e0.telegram || null,

      onboarded:   ("onboarded" in d) ? b(d.onboarded) : b(e0.onboarded),
      createdAt:   e0.createdAt || Date.now(),
      updatedAt:   Date.now()
    };

    await saveProfile(user.sub, p);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, profile: p }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
