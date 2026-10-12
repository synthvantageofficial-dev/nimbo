// Simulates the whole Telegram path offline: pair with a code -> send a message ->
// the worker does the real work -> the answer is delivered.
// Without TELEGRAM_BOT_TOKEN the send falls back to the in-app inbox, which is what we check.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(function (line) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
});
if (process.env.NIMBO_LOCAL_STORE === undefined) process.env.NIMBO_LOCAL_STORE = path.join(__dirname, "..", ".localstore");

const S = require("../functions/lib/store");
const tg = require("../functions/telegram");
const { drain } = require("../functions/lib/worker");

const SUB = "localtest-telegram";
const CHAT = 987654321;

function update(text) {
  return { httpMethod: "POST", headers: {}, body: JSON.stringify({ message: { chat: { id: CHAT }, text: text, from: { username: "testcreator" } } }) };
}
function line() { console.log("-".repeat(70)); }

async function main() {
  await S.saveProfile(SUB, {
    creatorName: "Telegram Tester", niche: "budget travel tips for India", platform: "short",
    language: "Hinglish", audience: "college students who travel cheap",
    tone: ["friendly", "practical"], onCamera: "faceless", onboarded: true,
    plan: "starter", planStatus: "active", autopilot: false
  });
  await S.unlinkChannel("telegram", CHAT);

  line();
  console.log("1. Unknown chat says hi -> should ask for a code");
  let r = await tg.handler(update("hello"));
  console.log("   ->", r.body);

  line();
  const code = await S.makeLinkCode(SUB);
  console.log("2. Creator sends the code from the app: " + code);
  r = await tg.handler(update(code));
  console.log("   ->", r.body);
  console.log("   linked sub:", await S.subForChannel("telegram", CHAT));

  line();
  console.log("3. Creator sends real work: 'goa par ek short video banao'");
  r = await tg.handler(update("goa par ek short video banao"));
  console.log("   ->", r.body, "(instant ack, work is queued)");

  line();
  console.log("4. Worker picks it up...");
  const t0 = Date.now();
  const out = await drain(3);
  console.log("   ->", JSON.stringify(out), "in", ((Date.now() - t0) / 1000).toFixed(1) + "s");

  line();
  const conv = await S.getConv(SUB);
  const last = conv.filter(function (m) { return m.role === "nimbo"; }).slice(-1)[0];
  console.log("5. Delivered answer (fell back to the app because no bot token locally):");
  console.log("   " + ((last && last.text) || "(nothing)").slice(0, 400));

  const briefs = await S.getBriefs(SUB);
  const u = await S.getUsage(SUB, S.planLimit("starter"));
  console.log("");
  console.log("briefs saved:", briefs.length, "| quota used:", u.count + "/" + u.limit);
  const ev = await S.getEvents(SUB);
  console.log("ledger:", ev.slice(0, 4).map(function (e) { return "[" + e.kind + "] " + e.text; }).join(" | "));
}

main().catch(function (e) { console.error("FATAL:", e); process.exit(1); });
