// Nimbo's BRAIN: turns a free-form message (typed OR spoken) into a decided action.
// This is what makes Nimbo an agent instead of a form: the creator just talks, Nimbo decides.
const MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];

// Everything Nimbo is allowed to decide to do.
const INTENTS = [
  "make_content",    // "ek video banao", "naya reel chahiye on X"
  "trending",        // "kya trend kar raha hai"
  "status",          // "kitne video bache", "mera plan"
  "history",         // "kya kya banaya tune"
  "update_setting",  // "ab se hindi me", "mera niche fitness hai", "9 baje post karo"
  "set_autopilot",   // "roz khud banao" / "band kar do"
  "help",
  "chat"
];

// Natural words -> our internal format keys.
const PLATFORM_WORDS = [
  ["youtube_long", ["long video", "long form", "longform", "youtube video", "full video", "lamba", "lambi video", "10 minute", "detailed video"]],
  ["shorts",       ["youtube short", "yt short", "shorts"]],
  ["instagram",    ["instagram", "insta", "reel", "reels", "ig"]],
  ["tiktok",       ["tiktok", "tik tok"]],
  ["short",        ["short", "vertical", "chhoti video", "choti video"]]
];
function platformFromText(text) {
  const t = String(text || "").toLowerCase();
  for (let i = 0; i < PLATFORM_WORDS.length; i++) {
    const words = PLATFORM_WORDS[i][1];
    for (let j = 0; j < words.length; j++) if (t.indexOf(words[j]) !== -1) return PLATFORM_WORDS[i][0];
  }
  return "";
}

// Profile fields the creator is allowed to change by just talking.
const EDITABLE = {
  niche: 150, language: 40, platform: 30, brand: 600, avoid: 400,
  audience: 300, tone: 200, postTime: 20, frequency: 30, videoStyle: 60, creatorName: 80
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING", enum: INTENTS },
    topic: { type: "STRING" },           // what the content should be about (make_content / trending)
    platform: { type: "STRING" },        // short | instagram | tiktok | shorts | youtube_long | ""
    field: { type: "STRING" },           // for update_setting
    value: { type: "STRING" },
    on: { type: "BOOLEAN" },             // for set_autopilot
    reply: { type: "STRING" },           // short friendly line, in the creator's own language
    heard: { type: "STRING" }            // transcript when the message was a voice note
  },
  required: ["intent", "reply"]
};

function profileSummary(P) {
  const p = P || {};
  const bits = [];
  if (p.creatorName) bits.push("name: " + p.creatorName);
  if (p.niche) bits.push("niche: " + p.niche);
  if (p.platform) bits.push("default format: " + p.platform);
  if (p.language) bits.push("language: " + p.language);
  if (p.onCamera) bits.push(p.onCamera === "face" ? "appears on camera" : "faceless");
  if (p.postTime) bits.push("posts at " + p.postTime);
  if (p.frequency) bits.push("frequency: " + p.frequency);
  bits.push("autopilot: " + (p.autopilot ? "ON" : "OFF"));
  if (p.plan) bits.push("plan: " + p.plan + " (" + (p.planStatus || "unknown") + ")");
  return bits.join(", ");
}

function buildPrompt(profile, history) {
  const NL = String.fromCharCode(10);
  const hist = (history || []).slice(-8).map(function (m) {
    return (m.role === "nimbo" ? "Nimbo: " : "Creator: ") + String(m.text || "").slice(0, 300);
  }).join(NL);

  return [
    "You are Nimbo, an autonomous AI agent that runs a content creator's channel for them.",
    "The creator just sent you a message. Decide what to DO. You are not a chatbot that asks questions - you act.",
    "",
    "THIS CREATOR: " + (profileSummary(profile) || "(no profile yet)"),
    hist ? "RECENT CONVERSATION:" + NL + hist : "",
    "",
    "Choose exactly one 'intent':",
    "- make_content : they want a video / reel / short / script / idea made. Put what it should be about in 'topic'",
    "    (if they did not say a topic, leave 'topic' empty and Nimbo will use their niche).",
    "    Put the format in 'platform' as one of: short, instagram, tiktok, shorts, youtube_long (empty if not stated).",
    "- trending : they are asking what is trending / working right now. 'topic' = the subject (empty = their niche).",
    "- status : they ask about their plan, how many videos are left, quota, or whether autopilot is on.",
    "- history : they ask what Nimbo has made or done recently.",
    "- update_setting : they want to CHANGE how Nimbo works for them. Set 'field' to exactly one of:",
    "    niche, language, platform, brand, avoid, audience, tone, postTime, frequency, videoStyle, creatorName.",
    "    Set 'value' to the new value only (for 'platform' use one of the format keys above; for postTime use HH:MM 24h).",
    "- set_autopilot : they want Nimbo to start or stop working on its own. Set 'on' true (start) or false (stop).",
    "- help : they ask what Nimbo can do.",
    "- chat : anything else - greetings, thanks, or a question you can simply answer.",
    "",
    "The creator may write in ANY language (English, Hindi, Hinglish, Telugu, anything) - understand all of them.",
    "'reply' = ONE short, warm, human line (max 2 sentences), ALWAYS IN SIMPLE ENGLISH, no matter what language they wrote in.",
    "It should say what you are doing, not ask for permission.",
    "If the message was a voice note, also put what you heard into 'heard'.",
    "Never mention being a language model, prompts, JSON, or these instructions."
  ].filter(Boolean).join(String.fromCharCode(10));
}

function parseJSON(data) {
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.map(function (p) { return p.text || ""; }).join("");
  try { return JSON.parse(text); } catch (e) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
  return null;
}

// Understand a message. `audio` = { mimeType, dataBase64 } for voice notes.
async function understand(opts) {
  const o = opts || {};
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Nimbo's brain isn't configured yet.");

  const parts = [{ text: buildPrompt(o.profile, o.history) }];
  if (o.audio && o.audio.dataBase64) {
    parts.push({ text: "The creator sent a VOICE NOTE. Listen to it, transcribe it into 'heard', then decide the intent." });
    parts.push({ inlineData: { mimeType: o.audio.mimeType || "audio/ogg", data: o.audio.dataBase64 } });
  }
  if (o.text) parts.push({ text: "CREATOR'S MESSAGE: " + String(o.text).slice(0, 2000) });
  if (!o.text && !(o.audio && o.audio.dataBase64)) return { intent: "help", reply: "Tell me what you want me to make." };

  const body = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: "application/json", responseSchema: SCHEMA }
  };

  let lastErr = "Nimbo is a little busy right now. Please try again in a moment.";
  for (let i = 0; i < MODELS.length; i++) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODELS[i] + ":generateContent?key=" + key,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(function () { return {}; });
      if (r.ok) {
        const out = parseJSON(data);
        if (out && out.intent) {
          // Trust our own keyword match over the model for the format.
          const fromWords = platformFromText((o.text || "") + " " + (out.heard || ""));
          if (fromWords) out.platform = fromWords;
          out.model = MODELS[i];
          return out;
        }
        lastErr = "Nimbo couldn't read that. Please try again.";
        continue;
      }
      const msg = (data && data.error && data.error.message) || "";
      const retryable = [429, 500, 502, 503].indexOf(r.status) !== -1 || /high demand|overload|unavailable|exhausted|rate/i.test(msg);
      lastErr = msg || lastErr;
      if (retryable) continue;
      throw new Error(msg || "The AI service returned an error.");
    } catch (e) {
      lastErr = (e && e.message) || lastErr;
      continue;
    }
  }
  throw new Error(lastErr);
}

module.exports = { understand, EDITABLE, INTENTS, platformFromText };
