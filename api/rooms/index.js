const { sql } = require("@vercel/postgres");
const {
  ensureSchema,
  seedIfEmpty,
  cleanupExpired,
  listRooms,
  addRoom,
  getJson,
} = require("../_db");

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
      if (!name) {
        return res.status(400).json({ error: "Room name is empty" });
      }
      const id = await addRoom(sql, name);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ id });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
