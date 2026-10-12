# -*- coding: utf-8 -*-
# Adds to lib/store.js: conversation memory, action ledger, channel identity links,
# one-time connect codes, and a task queue — the storage the autonomous engine needs.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/functions/lib/store.js"
s = io.open(P, encoding="utf-8").read()

NEW = r'''
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
'''

anchor = "module.exports = {"
assert anchor in s, "module.exports anchor not found"
s = s.replace(anchor, NEW.lstrip("\n") + "\n" + anchor, 1)

old_exports = "module.exports = { getProfile, saveProfile, getBriefs, addBrief, getUsage, incUsage, today, monthKey, FREE_DAILY_LIMIT, PLANS, FOUNDING_DISCOUNT, planLimit };"
new_exports = ("module.exports = { getProfile, saveProfile, getBriefs, addBrief, getUsage, incUsage, today, monthKey,\n"
               "  FREE_DAILY_LIMIT, PLANS, FOUNDING_DISCOUNT, planLimit,\n"
               "  getConv, addConv, getEvents, addEvent,\n"
               "  linkChannel, subForChannel, unlinkChannel,\n"
               "  makeLinkCode, useLinkCode,\n"
               "  queueTask, getTask, updateTask, listQueuedTasks };")
assert old_exports in s, "exports line not found"
s = s.replace(old_exports, new_exports, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("OK - store.js now has conv memory, action ledger, channel links, codes, task queue")
