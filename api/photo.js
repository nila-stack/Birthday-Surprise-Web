const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SECRET = process.env.ACCESS_SECRET;

function verifyToken(token) {
  if (!SECRET || !token) return false;

  const [data, signature] = token.split(".");
  if (!data || !signature) return false;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );

    return payload.unlocked === true && payload.exp > Date.now();
  } catch {
    return false;
  }
}

const FOLDERS = new Set(["album-1", "album-2", "album-3", "album-4"]);

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)birthday_access=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!verifyToken(token)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { folder, file } = req.query;

  if (
    typeof folder !== "string" ||
    typeof file !== "string" ||
    !FOLDERS.has(folder)
  ) {
    return res.status(400).json({ error: "Invalid asset" });
  }

  const extension = path.extname(file).toLowerCase();

  if (!EXTENSIONS.has(extension)) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  const privateRoot = path.resolve(process.cwd(), "private");
  const folderRoot = path.resolve(privateRoot, folder);
  const requestedPath = path.resolve(folderRoot, file);

  if (
    !requestedPath.startsWith(folderRoot + path.sep) ||
    !requestedPath.startsWith(privateRoot + path.sep)
  ) {
    return res.status(400).json({ error: "Invalid path" });
  }

  if (!fs.existsSync(requestedPath)) {
    return res.status(404).json({ error: "Not found" });
  }

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png"
  };

  res.setHeader("Content-Type", mimeTypes[extension]);
  res.setHeader("Cache-Control", "private, no-store");

  return res.status(200).send(fs.readFileSync(requestedPath));
};
