// Runs the REAL Nimbo locally: real functions, real Gemini, real YouTube trends.
// Storage goes to a local file (Netlify Blobs is not reachable from the laptop) and
// Google sign-in is skipped, so the agent can be tested without any deploy.
//
//   node tools/dev-server.js
//   then open:  http://localhost:8888/app.html?dev=1
//
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");

// --- load .env.local ---
const env = Object.assign({}, process.env);
fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).forEach(function (line) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

// --- local-only settings ---
env.NIMBO_LOCAL_STORE = path.join(root, ".localstore");  // file store instead of Netlify Blobs
env.NIMBO_DEV_USER = "founder@nimbo.local";              // skips Google sign-in
env.NIMBO_APP_URL = "http://localhost:8888/app.html";

console.log("");
console.log("  Nimbo dev server");
console.log("  ----------------");
console.log("  Gemini key   : " + (env.GEMINI_API_KEY ? "loaded" : "MISSING"));
console.log("  YouTube key  : " + (env.YOUTUBE_API_KEY ? "loaded" : "MISSING"));
console.log("  Telegram bot : " + (env.TELEGRAM_BOT_TOKEN ? "loaded" : "not set yet (chat still works)"));
console.log("  Storage      : " + env.NIMBO_LOCAL_STORE);
console.log("");
console.log("  >>> Open  http://localhost:8888/app.html?dev=1");
console.log("");

// --offline keeps the CLI from calling the Netlify API (it would try to link this folder
// to a site and fail while the account is blocked). Everything we need runs locally.
const args = ["netlify", "dev", "--offline", "--dir", "nimbo-site", "--functions", "functions", "--port", "8888"];
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, {
  cwd: root, env: env, stdio: "inherit", shell: process.platform === "win32"
});
child.on("exit", function (code) { process.exit(code || 0); });
