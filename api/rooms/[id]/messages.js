const crypto = require("crypto");
const { sql } = require("@vercel/postgres");
const {
  ensureSchema,
  seedIfEmpty,
  cleanupExpired,
  listMessages,
  addMessage,
  getRoomPasswordHash,
  getJson,
} = require("../../_db");

function hashPassword(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function verifyAccess(roomId, password) {
  const storedHash = await getRoomPasswordHash(sql, roomId);
  if (!storedHash) return true;
  const incomingHash = hashPassword(password || "");
  return storedHash === incomingHash;
}

module.exports = async (req, res) => {
  try {
    await ensureSchema(sql);
    await seedIfEmpty(sql);
    await cleanupExpired(sql);

    const roomId = Number(req.query.id);
    if (!roomId) {
      return res.status(400).json({ error: "Invalid room id" });
    }

    const password = req.headers["x-room-password"] || "";
    const allowed = await verifyAccess(roomId, password);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.method === "GET") {
      const messages = await listMessages(sql, roomId);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ messages });
    }

    if (req.method === "POST") {
      const body = await getJson(req);
      const author = String(body.author || "anon").slice(0, 12);
      const messageBody = String(body.body || "").trim().slice(0, 280);
      if (!messageBody) {
        return res.status(400).json({ error: "Message is empty" });
      }
      await addMessage(sql, roomId, author, messageBody);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};