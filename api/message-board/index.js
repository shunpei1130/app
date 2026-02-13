const { sql } = require("@vercel/postgres");
const {
  ensureSchema,
  getJson,
  listBoardPosts,
  addBoardPost,
} = require("../_db");

module.exports = async (req, res) => {
  try {
    await ensureSchema(sql);

    if (req.method === "GET") {
      const posts = await listBoardPosts(sql);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ posts });
    }

    if (req.method === "POST") {
      const body = await getJson(req);
      const nickname = String(body.nickname || "").trim().slice(0, 24);
      const messageBody = String(body.body || "").trim().slice(0, 1200);

      if (!messageBody) {
        return res.status(400).json({ error: "Message is empty" });
      }

      await addBoardPost(sql, nickname, messageBody);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
