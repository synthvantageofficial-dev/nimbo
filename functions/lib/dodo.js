// Dodo Payments helper. Test and live are completely separate hosts + keys.
function dodoHost() {
  return (process.env.DODO_MODE === "live") ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}
function dodoKey() { return process.env.DODO_API_KEY || ""; }

async function dodoFetch(path, options) {
  const opts = options || {};
  const r = await fetch(dodoHost() + path, {
    method: opts.method || "GET",
    headers: Object.assign({ "Authorization": "Bearer " + dodoKey(), "Content-Type": "application/json" }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let data = {};
  try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data: data };
}

module.exports = { dodoHost, dodoKey, dodoFetch };
