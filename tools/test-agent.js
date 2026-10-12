// Local end-to-end test of Nimbo's autonomous engine (real Gemini, real Netlify Blobs).
//   node tools/test-agent.js            -> run the whole conversation
//   node tools/test-agent.js "message"  -> send one message as the test creator
// Uses a throwaway account id, so it never touches a real creator's data.
const fs = require("fs");
const path = require("path");

// --- load .env.local (no dotenv dependency) ---
const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(function (line) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
});
process.env.NIMBO_BLOBS_TOKEN = process.env.NIMBO_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
// Netlify Blobs is not reachable from the laptop while deploys are blocked, so the test
// runs against a local file store. Set NIMBO_LOCAL_STORE="" to test against the real one.
if (process.env.NIMBO_LOCAL_STORE === undefined) process.env.NIMBO_LOCAL_STORE = path.join(__dirname, "..", ".localstore");

const S = require("../functions/lib/store");
const { handleMessage } = require("../functions/lib/agent");

const SUB = "localtest-agent";

const SCRIPT = [
  "bhai gym motivation par ek instagram reel banao",
  "kya trend kar raha hai",
  "ab se hindi me banao",
  "kitne video bache",
  "roz khud banao"
];

function line() { console.log("-".repeat(70)); }

async function main() {
  // A paying test creator with a full profile.
  await S.saveProfile(SUB, {
    creatorName: "Test Creator", niche: "home workouts and gym motivation",
    subTopics: ["fat loss", "no-equipment workouts"], audience: "20-30 year olds starting the gym",
    language: "Hinglish", country: "IN", platforms: ["instagram", "youtube"], platform: "short",
    tone: ["energetic", "no-nonsense"], onCamera: "faceless", videoStyle: "stock footage + captions",
    brand: "Simple, honest fitness advice. No supplements, no shortcuts.",
    avoid: "Never recommend supplements or crash diets.",
    frequency: "daily", postTime: "19:00",
    videoTool: "free_faceless", automation: "full_auto",
    autopilot: false, onboarded: true,
    plan: "creator", planStatus: "active", planStartedAt: Date.now()
  });
  console.log("test creator ready (sub=" + SUB + ", plan=creator)");

  const msgs = process.argv[2] ? [process.argv[2]] : SCRIPT;
  for (let i = 0; i < msgs.length; i++) {
    line();
    console.log("CREATOR: " + msgs[i]);
    const t0 = Date.now();
    try {
      const out = await handleMessage({ sub: SUB, text: msgs[i], channel: "web" });
      console.log("intent : " + out.intent + "   (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
      const r = out.reply || "";
      console.log("NIMBO  : " + (r.length > 1400 ? r.slice(0, 1400) + "\n...[" + r.length + " chars total]" : r));
      if (out.brief) console.log("[brief saved: " + ((out.brief.brief || {}).title || "?") + " | " + out.brief.platformLabel + " | script " + String((out.brief.brief || {}).script || "").split(/\s+/).length + " words]");
    } catch (e) {
      console.log("ERROR  : " + (e && e.message));
    }
  }

  line();
  const p = await S.getProfile(SUB);
  const u = await S.getUsage(SUB, S.planLimit(p.plan));
  console.log("final state -> language=" + p.language + "  autopilot=" + p.autopilot + "  used=" + u.count + "/" + u.limit);
  const ev = await S.getEvents(SUB);
  console.log("action ledger:");
  ev.slice(0, 8).forEach(function (e) { console.log("  [" + e.kind + "] " + e.text); });
}

main().catch(function (e) { console.error("FATAL:", e); process.exit(1); });
