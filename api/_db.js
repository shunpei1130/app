const DAY_MS = 24 * 60 * 60 * 1000;
let schemaReady = false;

async function ensureSchema(sql) {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at)`;
  schemaReady = true;
}

async function seedIfEmpty(sql) {
  const result = await sql`SELECT COUNT(*)::int AS count FROM rooms`;
  if (result.rows[0].count > 0) return;
  const now = Date.now();
  const rooms = ["Sunset Cafe", "Soft Studio", "Cozy Pets", "Cloud Diary"];
  for (const name of rooms) {
    await sql`INSERT INTO rooms (name, created_at) VALUES (${name}, ${now})`;
  }
  await addMessage(sql, 1, "A", "Good morning! I brought the fluffy stickers today.");
  await addMessage(sql, 1, "ME", "Yay! Drop them here and I will pin them to the top.");
  await addMessage(sql, 1, "N", "Tea of the day: peach milk. It is super sweet.");
}

async function cleanupExpired(sql) {
  const now = Date.now();
  await sql`DELETE FROM messages WHERE expires_at <= ${now}`;
}

async function listRooms(sql) {
  const now = Date.now();
  const result = await sql`
    SELECT r.id, r.name,
      (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id AND m.expires_at > ${now}) as active_messages,
      (SELECT MIN(m.expires_at) FROM messages m WHERE m.room_id = r.id AND m.expires_at > ${now}) as next_expire_at
    FROM rooms r
    ORDER BY r.id ASC
  `;
  return result.rows.map((row) => {
    const nextExpireAt = Number(row.next_expire_at) || now + DAY_MS;
    const diff = Math.max(0, nextExpireAt - now);
    const hours = Math.floor(diff / 3600000);
    return {
      id: row.id,
      name: row.name,
      activeMessages: Number(row.active_messages) || 0,
      nextExpireAt,
      nextExpiresIn: `${hours}h`,
    };
  });
}

async function listMessages(sql, roomId) {
  const now = Date.now();
  const result = await sql`
    SELECT id, author, body, created_at, expires_at
    FROM messages
    WHERE room_id = ${roomId} AND expires_at > ${now}
    ORDER BY created_at ASC
    LIMIT 200
  `;
  return result.rows.map((row) => ({
    id: row.id,
    author: row.author,
    body: row.body,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }));
}

async function addMessage(sql, roomId, author, body) {
  const now = Date.now();
  const expiresAt = now + DAY_MS;
  await sql`
    INSERT INTO messages (room_id, author, body, created_at, expires_at)
    VALUES (${roomId}, ${author}, ${body}, ${now}, ${expiresAt})
  `;
}

async function addRoom(sql, name) {
  const now = Date.now();
  const result = await sql`
    INSERT INTO rooms (name, created_at)
    VALUES (${name}, ${now})
    RETURNING id
  `;
  return result.rows[0].id;
}

async function getJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

module.exports = {
  ensureSchema,
  seedIfEmpty,
  cleanupExpired,
  listRooms,
  listMessages,
  addMessage,
  addRoom,
  getJson,
};
