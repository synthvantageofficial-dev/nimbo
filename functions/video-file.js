// Serves a finished video. The id is a 32-char random token that only the creator's own
// app and their Telegram message ever receive, so it works in a <video> tag without a header.
const S = require("./lib/store");

exports.handler = async (event) => {
  const id = String(((event.queryStringParameters || {}).id) || "").replace(/[^a-f0-9]/gi, "");
  if (id.length !== 32) return { statusCode: 400, body: "bad id" };

  const buf = await S.getBinary("video/" + id);
  if (!buf) return { statusCode: 404, body: "not found" };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": 'inline; filename="nimbo-video.mp4"'
    },
    body: buf.toString("base64"),
    isBase64Encoded: true
  };
};
