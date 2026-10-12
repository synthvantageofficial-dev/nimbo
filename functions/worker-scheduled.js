// Safety net. The instant path is telegram.js -> worker-background; if that ever fails
// (cold start, background functions unavailable), this picks the queue up within 5 minutes
// so a creator's request is never silently dropped.
const { drain } = require("./lib/worker");

exports.handler = async () => {
  try {
    const out = await drain(5);
    if (out.picked) console.log("nimbo scheduled worker:", JSON.stringify(out));
  } catch (e) {
    console.log("nimbo scheduled worker error:", (e && e.message) || e);
  }
  return { statusCode: 200 };
};
