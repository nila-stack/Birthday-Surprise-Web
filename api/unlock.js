const crypto = require("crypto");

const ACCESS_CODE = process.env.ACCESS_CODE || "1234";
const SECRET = process.env.ACCESS_SECRET;

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SECRET) {
    return res.status(500).json({ error: "ACCESS_SECRET is not configured" });
  }

  const { code } = req.body || {};

  if (code !== ACCESS_CODE) {
    return res.status(401).json({ error: "Incorrect code" });
  }

  const payload = {
    unlocked: true,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  };

  const token = sign(payload);

  res.setHeader(
    "Set-Cookie",
    `birthday_access=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );

  return res.status(200).json({ ok: true });
};
