// Scheduled function — runs on a schedule (set in netlify.toml) and lets Nimbo work on its own.
const { runAutopilot } = require("./lib/autopilot");

exports.handler = async () => {
  const result = await runAutopilot(50);
  return { statusCode: 200, body: JSON.stringify(result) };
};
