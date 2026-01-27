const crypto = require("crypto");
const { sql } = require("@vercel/postgres");
const {
  ensureSchema,
  seedIfEmpty,
  cleanupExpired,
  listRooms,
  addRoom,
  getJson,
} = require("../_db");

function hashPassword(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

module.exports = async (req, res) => {
  try {
    await ensureSchema(sql);
    await seedIfEmpty(sql);
    await cleanupExpired(sql);

    if (req.method === "GET") {
      const rooms = await listRooms(sql);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ rooms });
    }

    if (req.method === "POST") {
      const body = await getJson(req);
      const name = String(body.name || "").trim().slice(0, 40);
      const password = String(body.password || "").trim();
      if (!name) {
        return res.status(400).json({ error: "Room name is empty" });
      }
      const passwordHash = password ? hashPassword(password) : "";
      const id = await addRoom(sql, name, passwordHash);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ id });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};