// Netlify Blobs storage for Nimbo (profiles, saved briefs, usage counters).
const FREE_DAILY_LIMIT = 10; // legacy fallback

// Subscription plans (monthly video/brief quota).
const PLANS = {
  starter: { id: "starter", name: "Starter", price: 19, videos: 30,  blurb: "1 video a day",
             productId: process.env.DODO_PRODUCT_STARTER || "pdt_0NpTSSDgxXoi7ReQ62UVJ" },
  creator: { id: "creator", name: "Creator", price: 39, videos: 90,  blurb: "3 videos a day",
             productId: process.env.DODO_PRODUCT_CREATOR || "pdt_0NpTSNxiPATP4iAsyyUk7" },
  pro:     { id: "pro",     name: "Pro",     price: 79, videos: 300, blurb: "10 videos a day",
             productId: process.env.DODO_PRODUCT_PRO     || "pdt_0NpTSSjmqk3kiFYN1Axoj" }
};
const FOUNDING_DISCOUNT = 0.30; // first 1000 creators - 30% off for life
function planLimit(plan) { return (PLANS[plan] && PLANS[plan].videos) || 0; }
function monthKey() { return new Date().toISOString().slice(0, 7); }
// A file-backed stand-in for Netlify Blobs, used only when NIMBO_LOCAL_STORE is set.
// It lets the whole agent be tested on a laptop with no deploy and no network.
function localStore(dir) {
  const fs = require("fs"), path = require("path");
  const file = path.join(dir, "nimbo-store.json");
  function load() { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return {}; } }
  function dump(d) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(d, null, 2)); }
  function binPath(key) { return path.join(dir, "bin", key.replace(/[^a-zA-Z0-9_.-]/g, "_")); }
  return {
    async get(key) { const d = load(); return (key in d) ? d[key] : null; },
    async set(key, val) { const d = load(); d[key] = String(val); dump(d); },
    async delete(key) { const d = load(); delete d[key]; dump(d); },
    async setBin(key, buf) { const f = binPath(key); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); },
    async getBin(key) { const f = binPath(key); return fs.existsSync(f) ? fs.readFileSync(f) : null; },
    async delBin(key) { const f = binPath(key); try { fs.unlinkSync(f); } catch (e) {} },
    async list(opts) {
      const prefix = (opts && opts.prefix) || "";
      return { blobs: Object.keys(load()).filter(function (k) { return k.indexOf(prefix) === 0; }).map(function (k) { return { key: k }; }) };
    }
  };
}

let _store;
async function store() {
  if (_store) return _store;
  if (process.env.NIMBO_LOCAL_STORE) { _store = localStore(process.env.NIMBO_LOCAL_STORE); return _store; }
  const { getStore } = await import("@netlify/blobs");
  _store = getStore({ name: "nimbo", siteID: process.env.NIMBO_SITE_ID, token: process.env.NIMBO_BLOBS_TOKEN });
  return _store;
}

async function getJSON(key, fallback) {
  try {
    const s = await store();
    const v = await s.get(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
async function setJSON(key, obj) {
  const s = await store();
  await s.set(key, JSON.stringify(obj));
}
function today() { return new Date().toISOString().slice(0, 10); }

async function getProfile(sub) { return getJSON("profile/" + sub, null); }
async function saveProfile(sub, data) { await setJSON("profile/" + sub, data); }

async function getBriefs(sub) { return getJSON("briefs/" + sub, []); }
async function addBrief(sub, brief) {
  const list = await getBriefs(sub);
  list.unshift(brief);
  const capped = list.slice(0, 20);
  await setJSON("briefs/" + sub, capped);
  return capped;
}

async function getUsage(sub, limit) {
  const u = await getJSON("usage/" + sub, { month: "", count: 0 });
  const m = monthKey();
  if (u.month !== m) { u.month = m; u.count = 0; }
  return { month: u.month, count: u.count, limit: limit };
}
async function incUsage(sub) {
  const key = "usage/" + sub;
  const u = await getJSON(key, { month: "", count: 0 });
  const m = monthKey();
  if (u.month !== m) { u.month = m; u.count = 0; }
  u.count += 1;
  await setJSON(key, u);
  return u.count;
}

// ---------------------------------------------------------------------------
// AUTONOMOUS ENGINE STORAGE
// ---------------------------------------------------------------------------

// --- conversation memory (so Nimbo remembers the chat like a real assistant) ---
async function getConv(sub) { return getJSON("conv/" + sub, []); }
async function addConv(sub, role, text) {
  const list = await getConv(sub);
  list.push({ role: role, text: String(text == null ? "" : text).slice(0, 1200), at: Date.now() });
  const capped = list.slice(-20);
  await setJSON("conv/" + sub, capped);
  return capped;
}

// --- action ledger: every single thing Nimbo did on its own, so the creator can audit it ---
async function getEvents(sub) { return getJSON("events/" + sub, []); }
async function addEvent(sub, kind, text, extra) {
  const list = await getEvents(sub);
  list.unshift(Object.assign({ at: Date.now(), kind: String(kind || "info"), text: String(text == null ? "" : text).slice(0, 300) }, extra || {}));
  const capped = list.slice(0, 50);
  await setJSON("events/" + sub, capped);
  return capped;
}

// --- channel identity: telegram chat id / email address -> Nimbo user ---
function linkKey(channel, id) { return "link/" + channel + "/" + String(id == null ? "" : id).toLowerCase().trim(); }
async function linkChannel(channel, id, sub) { await setJSON(linkKey(channel, id), { sub: sub, at: Date.now() }); }
async function subForChannel(channel, id) {
  const v = await getJSON(linkKey(channel, id), null);
  return (v && v.sub) ? v.sub : null;
}
async function unlinkChannel(channel, id) {
  try { const st = await store(); await st.delete(linkKey(channel, id)); } catch (e) {}
}

// --- one-time connect codes (shown in the app, sent to the bot to pair it) ---
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
const CODE_TTL = 30 * 60 * 1000; // 30 minutes
function newCode() {
  const crypto = require("crypto");
  const b = crypto.randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return out;
}
async function makeLinkCode(sub) {
  const held = await getJSON("codefor/" + sub, null);
  if (held && held.code && (Date.now() - held.at) < CODE_TTL) return held.code;
  const code = newCode();
  await setJSON("code/" + code, { sub: sub, at: Date.now() });
  await setJSON("codefor/" + sub, { code: code, at: Date.now() });
  return code;
}
async function useLinkCode(code) {
  const c = String(code == null ? "" : code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== 6) return null;
  const v = await getJSON("code/" + c, null);
  if (!v || !v.sub) return null;
  if ((Date.now() - v.at) > CODE_TTL) return null;
  try { const st = await store(); await st.delete("code/" + c); } catch (e) {}
  return v.sub;
}

// --- task queue: a request arrives on any channel, a worker finishes it later ---
async function queueTask(task) {
  const crypto = require("crypto");
  const id = Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex");
  const t = Object.assign({ id: id, status: "queued", createdAt: Date.now() }, task || {});
  await setJSON("task/" + id, t);
  return t;
}
async function getTask(id) { return getJSON("task/" + id, null); }
async function updateTask(id, patch) {
  const t = await getTask(id);
  if (!t) return null;
  const next = Object.assign({}, t, patch || {}, { updatedAt: Date.now() });
  await setJSON("task/" + id, next);
  return next;
}
async function listQueuedTasks(max) {
  const out = [];
  try {
    const st = await store();
    const listing = await st.list({ prefix: "task/" });
    const keys = (listing && listing.blobs ? listing.blobs : []).map(function (b) { return b.key; });
    for (let i = 0; i < keys.length && out.length < (max || 20); i++) {
      const t = await getJSON(keys[i], null);
      if (t && t.status === "queued") out.push(t);
    }
  } catch (e) {}
  out.sort(function (a, b) { return a.createdAt - b.createdAt; });
  return out;
}

// --- finished videos (binary) -------------------------------------------------
// Netlify Blobs stores the bytes directly; the local file store keeps them beside the JSON.
async function putBinary(key, buffer) {
  const st = await store();
  if (st.setBin) { await st.setBin(key, buffer); return; }
  await st.set(key, buffer);
}
async function getBinary(key) {
  const st = await store();
  if (st.getBin) return st.getBin(key);
  try {
    const ab = await st.get(key, { type: "arrayBuffer" });
    return ab ? Buffer.from(ab) : null;
  } catch (e) { return null; }
}
async function deleteBinary(key) {
  const st = await store();
  if (st.delBin) { await st.delBin(key); return; }
  try { await st.delete(key); } catch (e) {}
}

// Keep only the newest few videos per creator so storage never piles up.
async function rememberVideo(sub, id, keep) {
  const list = await getJSON("videos/" + sub, []);
  list.unshift({ id: id, at: Date.now() });
  const max = keep || 3;
  const drop = list.slice(max);
  await setJSON("videos/" + sub, list.slice(0, max));
  for (let i = 0; i < drop.length; i++) await deleteBinary("video/" + drop[i].id);
  return list.slice(0, max);
}

module.exports = { getProfile, saveProfile, getBriefs, addBrief, getUsage, incUsage, today, monthKey,
  FREE_DAILY_LIMIT, PLANS, FOUNDING_DISCOUNT, planLimit,
  getConv, addConv, getEvents, addEvent,
  linkChannel, subForChannel, unlinkChannel,
  makeLinkCode, useLinkCode,
  queueTask, getTask, updateTask, listQueuedTasks,
  putBinary, getBinary, deleteBinary, rememberVideo };
