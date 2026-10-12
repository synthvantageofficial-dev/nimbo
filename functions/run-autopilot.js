// Manual trigger for the autopilot run (for testing). Guarded by a secret header.
const { runAutopilot } = require("./lib/autopilot");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const secret = (event.headers && (event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"])) || "";
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "unauthorized" }) };
  }
  const result = await runAutopilot(50);
  return { statusCode: 200, headers, body: JSON.stringify(result) };
};
