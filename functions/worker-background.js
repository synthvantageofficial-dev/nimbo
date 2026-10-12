// Background worker. Netlify answers 202 instantly and keeps this running, so Nimbo can take
// as long as it needs (long scripts, voice transcription) without any channel timing out.
const { drain } = require("./lib/worker");

exports.handler = async () => {
  try {
    const out = await drain(5);
    console.log("nimbo worker:", JSON.stringify(out));
  } catch (e) {
    console.log("nimbo worker error:", (e && e.message) || e);
  }
  return { statusCode: 200 };
};
