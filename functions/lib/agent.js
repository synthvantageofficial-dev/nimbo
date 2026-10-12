// Nimbo's AGENT LOOP: message in (any channel) -> understand -> DO IT -> answer back.
// Every inbound channel (Telegram, email, web) calls handleMessage() and nothing else.
const { understand, EDITABLE } = require("./brain");
const { generateBrief, getTrending, viewsShort } = require("./engine");
const { makeVideo, canRender } = require("./video");
const crypto = require("crypto");
const S = require("./store");

const APP = process.env.NIMBO_APP_URL || "https://nimbo-4sc3.netlify.app/app.html";
const NL = String.fromCharCode(10);

function ago(ts) {
  const m = Math.max(1, Math.round((Date.now() - (ts || 0)) / 60000));
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}

// Can this creator have work done right now?
async function checkQuota(sub, profile) {
  const plan = (profile && profile.plan) || "";
  const limit = S.planLimit(plan);
  const active = plan && limit && (!profile.planStatus || profile.planStatus === "active");
  if (!active) {
    return { ok: false, reply: "Your plan isn't active yet, so I can't create for you." + NL + "Pick a plan here: " + APP };
  }
  const u = await S.getUsage(sub, limit);
  if (u.count >= limit) {
    const nm = (S.PLANS[plan] && S.PLANS[plan].name) || plan;
    return { ok: false, reply: "You have used all " + limit + " videos in your " + nm + " plan this month. Upgrade and I'll keep going: " + APP };
  }
  return { ok: true, limit: limit, usage: u, plan: plan };
}

// A brief, written out for a chat / email — not a dashboard.
function formatBrief(out) {
  const b = out.brief || {};
  const lines = [];
  lines.push("🎬 " + (b.title || "Your next video"));
  lines.push("");
  const pick = (b.ideas || [])[b.best_pick_index || 0];
  if (pick && pick.hook) lines.push("HOOK (first 2 seconds):" + NL + pick.hook);
  if (pick && pick.why) lines.push(NL + "Why this works: " + pick.why);
  lines.push("");
  lines.push("FORMAT: " + (out.platformLabel || out.platform || ""));
  lines.push("");
  lines.push("SCRIPT:" + NL + (b.script || ""));
  if (b.thumbnail_text) lines.push(NL + "THUMBNAIL TEXT: " + b.thumbnail_text);
  if (b.description) lines.push(NL + "CAPTION:" + NL + b.description);
  if (b.hashtags && b.hashtags.length) lines.push(NL + "HASHTAGS: " + b.hashtags.map(function (h) { return "#" + String(h).replace(/^#/, ""); }).join(" "));
  if (out.trending && out.trending.length) {
    lines.push(NL + "Based on what is trending right now:");
    lines.push(out.trending.slice(0, 3).map(function (v) { return "- " + v.title + " (" + viewsShort(v.views) + " views, " + v.ageDays + "d)"; }).join(NL));
  }
  lines.push(NL + "Saved in your Nimbo: " + APP);
  return lines.join(NL);
}

// ---------------------------------------------------------------------------
// the actions Nimbo can take
// ---------------------------------------------------------------------------

// Build the real MP4 for a brief, when the creator chose Nimbo's free faceless video.
// A failure here must never lose the brief - they still keep everything that was written.
// Used by chat AND by autopilot, so both deliver the same thing.
async function renderVideoFor(sub, out, profile, platform) {
  const wantsVideo = (profile.videoTool || "free_faceless") === "free_faceless";
  if (!wantsVideo) return out;
  if (!canRender()) { out.videoError = "notready"; return out; }
  try {
    const res = await makeVideo({ brief: out.brief, platform: platform || out.platform || "short", voice: profile.voicePref || "" });
    const fs = require("fs");
    const id = crypto.randomBytes(16).toString("hex");
    await S.putBinary("video/" + id, fs.readFileSync(res.file));
    await S.rememberVideo(sub, id);
    try { fs.rmSync(res.workDir, { recursive: true, force: true }); } catch (e) {}
    out.video = { id: id, seconds: res.seconds, bytes: res.bytes, scenes: res.scenes };
    out.videoUrl = "/.netlify/functions/video-file?id=" + id;
  } catch (e) {
    out.videoError = (e && e.message) || "Video rendering failed.";
  }
  return out;
}

async function doMakeContent(sub, profile, d) {
  const gate = await checkQuota(sub, profile);
  if (!gate.ok) return { reply: gate.reply, blocked: true };

  const topic = (d.topic || "").toString().trim() || profile.niche || "";
  if (!topic) return { reply: "Tell me your niche first, then I can work on my own. Set it up here: " + APP };
  const platform = d.platform || profile.platform || "short";

  const out = await generateBrief({ niche: topic, platform: platform, brand: profile.brand || "", profile: profile });
  out.source = d.channel || "chat";

  await renderVideoFor(sub, out, profile, platform);

  await S.addBrief(sub, out).catch(function () {});
  const count = await S.incUsage(sub).catch(function () { return gate.usage.count + 1; });
  await S.addEvent(sub, "content", "Made \"" + ((out.brief && out.brief.title) || topic) + "\"", { platform: platform, channel: d.channel || "chat" });

  const left = Math.max(0, gate.limit - count);
  let videoLine = "";
  if (out.video) {
    videoLine = NL + NL + "🎥 Your video is ready - " + out.video.seconds + "s, " + out.video.scenes + " scenes. It's in your Nimbo, and I'm sending it to you now.";
  } else if (out.videoError === "notready") {
    videoLine = NL + NL + "🎥 Video rendering isn't switched on yet on this server - you have the full script above in the meantime.";
  } else if (out.videoError) {
    videoLine = NL + NL + "🎥 I couldn't finish the video this time (" + out.videoError + "). The script above is ready to shoot.";
  }
  return {
    reply: formatBrief(out) + videoLine + NL + NL + "(" + left + " videos left this month)",
    brief: out
  };
}

async function doTrending(sub, profile, d) {
  const topic = (d.topic || "").toString().trim() || profile.niche || "";
  if (!topic) return { reply: "Which topic should I check?" };
  const ytKey = process.env.YOUTUBE_API_KEY;
  const list = ytKey ? await getTrending(topic, ytKey) : [];
  if (!list.length) return { reply: "No strong trend on \"" + topic + "\" right now. I'll keep watching and tell you when something moves." };
  await S.addEvent(sub, "research", "Checked trends for " + topic);
  return {
    reply: "🔥 Trending in \"" + topic + "\" right now (last 30 days, fastest growing):" + NL + NL
      + list.map(function (v, i) { return (i + 1) + ". " + v.title + NL + "   " + viewsShort(v.views) + " views - " + v.ageDays + "d old - " + v.channel; }).join(NL)
      + NL + NL + "Say \"make a video on this\" and I'll write it for you."
  };
}

async function doStatus(sub, profile) {
  const plan = profile.plan || "";
  const limit = S.planLimit(plan);
  const u = await S.getUsage(sub, limit);
  const nm = (S.PLANS[plan] && S.PLANS[plan].name) || "none";
  const lines = [];
  lines.push("📊 Your Nimbo:");
  lines.push("Plan: " + nm + (profile.planStatus ? " (" + profile.planStatus + ")" : ""));
  if (limit) lines.push("This month: " + u.count + " / " + limit + " videos used, " + Math.max(0, limit - u.count) + " left");
  lines.push("Autopilot: " + (profile.autopilot ? "ON - I create for you every day" : "OFF - I only create when you ask"));
  if (profile.niche) lines.push("Niche: " + profile.niche);
  if (profile.language) lines.push("Language: " + profile.language);
  if (profile.postTime) lines.push("Posting time: " + profile.postTime);
  return { reply: lines.join(NL) };
}

async function doHistory(sub) {
  const [briefs, events] = await Promise.all([S.getBriefs(sub), S.getEvents(sub)]);
  if (!briefs.length && !events.length) return { reply: "Nothing yet. Tell me what to make and I'll get started." };
  const lines = ["🗂 Here is what I have done:"];
  briefs.slice(0, 5).forEach(function (b) {
    lines.push("- " + (((b.brief || {}).title) || b.niche || "brief") + " (" + (b.platformLabel || b.platform || "") + ", " + ago(b.createdAt) + ")" + (b.auto ? " [made on autopilot]" : ""));
  });
  const other = events.filter(function (e) { return e.kind !== "content"; }).slice(0, 4);
  if (other.length) {
    lines.push("");
    other.forEach(function (e) { lines.push("- " + e.text + " (" + ago(e.at) + ")"); });
  }
  return { reply: lines.join(NL) };
}

async function doUpdateSetting(sub, profile, d) {
  const field = String(d.field || "").trim();
  let value = String(d.value == null ? "" : d.value).trim();
  if (!field || !(field in EDITABLE) || !value) {
    return { reply: "I couldn't change that one from chat. You can edit it in your setup: " + APP };
  }
  value = value.slice(0, EDITABLE[field]);

  const next = Object.assign({}, profile);
  if (field === "tone") {
    next.tone = value.split(/[,/]+/).map(function (x) { return x.trim().slice(0, 40); }).filter(Boolean).slice(0, 8);
  } else if (field === "platform") {
    const ok = ["short", "instagram", "tiktok", "shorts", "youtube_long"];
    if (ok.indexOf(value) === -1) return { reply: "I didn't catch the format. Say one of: short, Instagram, TikTok, YouTube Short, or YouTube long video." };
    next.platform = value;
  } else {
    next[field] = value;
  }
  next.updatedAt = Date.now();
  await S.saveProfile(sub, next);
  await S.addEvent(sub, "setting", "Changed " + field + " to \"" + value + "\"");
  return { reply: "✅ Done - your " + field + " is now \"" + value + "\". I'll use that from now on.", profileChanged: true };
}

async function doAutopilot(sub, profile, d) {
  const on = !!d.on;
  const next = Object.assign({}, profile, { autopilot: on, updatedAt: Date.now() });
  await S.saveProfile(sub, next);
  await S.addEvent(sub, "autopilot", on ? "Autopilot turned ON" : "Autopilot turned OFF");
  return {
    reply: on
      ? "🤖 Autopilot is ON. I'll create for you every day and send it straight to you - you don't have to do anything."
      : "Autopilot is OFF. I'll only create when you ask me to.",
    profileChanged: true
  };
}

function doHelp(profile) {
  return {
    reply: [
      "I'm Nimbo - your content team. Just tell me what you need (type it or send a voice note):",
      "",
      "• \"make a reel about gym motivation\" - full script, title, caption and hashtags",
      "• \"make a long YouTube video\" - tell me the format and I'll write for it",
      "• \"what's trending\" - real trending videos in your niche right now",
      "• \"write in Hindi from now on\" / \"my niche is fitness\" - I'll update your settings",
      "• \"work on your own every day\" - turns on autopilot",
      "• \"how many videos are left\" - your plan and quota",
      "",
      "You can write in any language - I'll understand and reply in English.",
      profile && profile.autopilot ? "Autopilot is ON right now." : "Tip: say \"work on your own every day\" and I'll start creating without being asked."
    ].join(NL)
  };
}

// ---------------------------------------------------------------------------
// the loop
// ---------------------------------------------------------------------------

// opts: { sub, text, audio:{mimeType,dataBase64}, channel }
async function handleMessage(opts) {
  const o = opts || {};
  const sub = o.sub;
  if (!sub) throw new Error("No user.");

  const profile = (await S.getProfile(sub)) || {};
  if (!profile.onboarded && !profile.niche) {
    return { intent: "onboard", reply: "Hi! Let's set you up once (takes 2 minutes) - after that I can work on my own: " + APP };
  }

  const history = await S.getConv(sub).catch(function () { return []; });
  const decision = await understand({ text: o.text, audio: o.audio, profile: profile, history: history });
  const said = o.text || decision.heard || "(voice note)";
  await S.addConv(sub, "creator", said).catch(function () {});

  let result;
  try {
    switch (decision.intent) {
      case "make_content":   result = await doMakeContent(sub, profile, { topic: decision.topic, platform: decision.platform, channel: o.channel }); break;
      case "trending":       result = await doTrending(sub, profile, { topic: decision.topic }); break;
      case "status":         result = await doStatus(sub, profile); break;
      case "history":        result = await doHistory(sub); break;
      case "update_setting": result = await doUpdateSetting(sub, profile, decision); break;
      case "set_autopilot":  result = await doAutopilot(sub, profile, decision); break;
      case "help":           result = doHelp(profile); break;
      default:               result = { reply: decision.reply || "Tell me what you'd like me to make." }; break;
    }
  } catch (e) {
    result = { reply: "Something went wrong: " + ((e && e.message) || "please try again") + NL + "Give it a moment and ask me again." };
  }

  // Nimbo's own one-liner first, then the work.
  const ack = (decision.reply || "").trim();
  let reply = result.reply || ack;
  if (ack && result.brief) reply = ack + NL + NL + reply;

  // Note: the reply is saved to the conversation by channels.deliver(), not here - one owner only.
  return { intent: decision.intent, heard: decision.heard || "", reply: reply, brief: result.brief || null, blocked: !!result.blocked };
}

module.exports = { handleMessage, formatBrief, checkQuota, ago, renderVideoFor };
