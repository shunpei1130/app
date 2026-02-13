const DAY_MS = 24 * 60 * 60 * 1000;
let schemaReady = false;

async function ensureSchema(sql) {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      password_hash TEXT
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
  await sql`
    CREATE TABLE IF NOT EXISTS feedback_messages (
      id SERIAL PRIMARY KEY,
      nickname TEXT,
      email TEXT,
      opinion TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS message_board_posts (
      id SERIAL PRIMARY KEY,
      nickname TEXT,
      body TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_rooms_created ON rooms(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_messages(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_message_board_created ON message_board_posts(created_at)`;
  await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  schemaReady = true;
}

async function seedIfEmpty(sql) {
  const result = await sql`SELECT COUNT(*)::int AS count FROM rooms`;
  if (result.rows[0].count > 0) return;
  const now = Date.now();
  const rooms = ["Sunset Cafe", "Soft Studio", "Cozy Pets", "Cloud Diary"];
  const insertedRoomIds = [];
  for (const name of rooms) {
    const inserted = await sql`
      INSERT INTO rooms (name, created_at)
      VALUES (${name}, ${now})
      RETURNING id
    `;
    insertedRoomIds.push(inserted.rows[0].id);
  }
  const firstRoomId = insertedRoomIds[0];
  await addMessage(sql, firstRoomId, "A", "Good morning! I brought the fluffy stickers today.");
  await addMessage(sql, firstRoomId, "ME", "Yay! Drop them here and I will pin them to the top.");
  await addMessage(sql, firstRoomId, "N", "Tea of the day: peach milk. It is super sweet.");
}

async function cleanupExpired(sql) {
  const now = Date.now();
  const roomExpireThreshold = now - DAY_MS;
  await sql`DELETE FROM messages WHERE expires_at <= ${now}`;
  await sql`
    DELETE FROM messages
    WHERE room_id IN (
      SELECT id
      FROM rooms
      WHERE created_at <= ${roomExpireThreshold}
    )
  `;
  await sql`DELETE FROM rooms WHERE created_at <= ${roomExpireThreshold}`;
}

async function listRooms(sql) {
  const now = Date.now();
  const result = await sql`
    SELECT r.id, r.name, r.created_at,
      (r.password_hash IS NOT NULL AND r.password_hash <> '') as has_password,
      (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id AND m.expires_at > ${now}) as active_messages
    FROM rooms r
    ORDER BY r.id ASC
  `;
  return result.rows.map((row) => {
    const nextExpireAt = Number(row.created_at) + DAY_MS;
    const diff = Math.max(0, nextExpireAt - now);
    const hours = Math.floor(diff / 3600000);
    return {
      id: row.id,
      name: row.name,
      activeMessages: Number(row.active_messages) || 0,
      nextExpireAt,
      nextExpiresIn: `${hours}h`,
      hasPassword: row.has_password === true,
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

async function addRoom(sql, name, passwordHash) {
  const now = Date.now();
  const result = await sql`
    INSERT INTO rooms (name, created_at, password_hash)
    VALUES (${name}, ${now}, ${passwordHash || null})
    RETURNING id
  `;
  return result.rows[0].id;
}

async function addFeedback(sql, nickname, email, opinion) {
  const now = Date.now();
  await sql`
    INSERT INTO feedback_messages (nickname, email, opinion, created_at)
    VALUES (${nickname || null}, ${email || null}, ${opinion}, ${now})
  `;
}

async function listBoardPosts(sql) {
  const result = await sql`
    SELECT id, nickname, body, created_at
    FROM message_board_posts
    ORDER BY created_at DESC
    LIMIT 300
  `;
  return result.rows.map((row) => ({
    id: Number(row.id),
    nickname: row.nickname || "",
    body: row.body,
    createdAt: Number(row.created_at),
  }));
}

async function addBoardPost(sql, nickname, body) {
  const now = Date.now();
  await sql`
    INSERT INTO message_board_posts (nickname, body, created_at)
    VALUES (${nickname || null}, ${body}, ${now})
  `;
}

async function getRoomPasswordHash(sql, roomId) {
  const result = await sql`
    SELECT password_hash
    FROM rooms
    WHERE id = ${roomId}
  `;
  if (!result.rows[0]) return null;
  return result.rows[0].password_hash || "";
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
  addFeedback,
  listBoardPosts,
  addBoardPost,
  getRoomPasswordHash,
  getJson,
};
