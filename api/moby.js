const CF_ACCOUNT_ID = "1ec4b5bc6f5900ea97357a03414123a0";
const CF_API_TOKEN = "molc-EZbbuusYxEHaWSEt5FSZilueC1xYdavPr5r";
const MOBY_SYSTEM_PROMPT = "あなたは「モビー」という名前のやさしいAIアシスタントです。ユーザーの相談に親切に、やさしい口調で答えてください。回答は簡潔にしてください。";

module.exports = async (req, res) => {
  // CORSヘッダー
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // リクエストボディを取得
    let body = "";
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", resolve);
      req.on("error", reject);
    });

    const { messages } = JSON.parse(body || "{}");
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    // Cloudflare Workers AI を呼び出し
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/qwen/qwen3-30b-a3b-fp8`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: MOBY_SYSTEM_PROMPT },
            ...messages
          ],
        }),
      }
    );

    if (!cfRes.ok) {
      const errorData = await cfRes.json().catch(() => ({}));
      console.error("Cloudflare AI Error:", errorData);
      return res.status(cfRes.status).json({ error: "Cloudflare AI Error", details: errorData });
    }

    const data = await cfRes.json();
    const response = data.result?.response || null;

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ response });
  } catch (err) {
    console.error("Moby API Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
