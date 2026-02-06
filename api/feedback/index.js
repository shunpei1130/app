const { sql } = require("@vercel/postgres");
const {
  ensureSchema,
  getJson,
  addFeedback,
} = require("../_db");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  try {
    await ensureSchema(sql);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = await getJson(req);
    const nickname = String(body.nickname || "").trim().slice(0, 24);
    const email = String(body.email || "").trim().slice(0, 120);
    const opinion = String(body.opinion || "").trim().slice(0, 1200);

    if (!opinion) {
      return res.status(400).json({ error: "Opinion is empty" });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    await addFeedback(sql, nickname, email.toLowerCase(), opinion);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
