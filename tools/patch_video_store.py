# -*- coding: utf-8 -*-
# Binary storage for finished videos: works with Netlify Blobs in production and with the
# local file store on the laptop. Videos are kept small and pruned, so storage stays near zero.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/functions/lib/store.js"
s = io.open(P, encoding="utf-8").read()

if "putBinary" in s:
    print("already added")
    raise SystemExit

# --- local file store needs binary get/set too ---
old_local = """  return {
    async get(key) { const d = load(); return (key in d) ? d[key] : null; },
    async set(key, val) { const d = load(); d[key] = String(val); dump(d); },
    async delete(key) { const d = load(); delete d[key]; dump(d); },"""
new_local = """  function binPath(key) { return path.join(dir, "bin", key.replace(/[^a-zA-Z0-9_.-]/g, "_")); }
  return {
    async get(key) { const d = load(); return (key in d) ? d[key] : null; },
    async set(key, val) { const d = load(); d[key] = String(val); dump(d); },
    async delete(key) { const d = load(); delete d[key]; dump(d); },
    async setBin(key, buf) { const f = binPath(key); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); },
    async getBin(key) { const f = binPath(key); return fs.existsSync(f) ? fs.readFileSync(f) : null; },
    async delBin(key) { const f = binPath(key); try { fs.unlinkSync(f); } catch (e) {} },"""
assert old_local in s, "local store anchor"
s = s.replace(old_local, new_local, 1)

# --- the shared binary API ---
NEW = r'''
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

'''
anchor = "module.exports = {"
s = s.replace(anchor, NEW.lstrip("\n") + anchor, 1)

s = s.replace("  queueTask, getTask, updateTask, listQueuedTasks };",
              "  queueTask, getTask, updateTask, listQueuedTasks,\n  putBinary, getBinary, deleteBinary, rememberVideo };", 1)

io.open(P, "w", encoding="utf-8").write(s)
print("store.js: binary video storage added")
