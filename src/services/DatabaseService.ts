import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'faceauth.db', location: 'default' });
  return db;
};

const dateKey = (ts: number): string => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Cosine similarity between two embeddings
const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const DatabaseService = {

  async init(): Promise<void> {
    const database = await getDb();
    await database.executeSql(`
      CREATE TABLE IF NOT EXISTS face_templates (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        embedding TEXT NOT NULL,
        enrolled_at INTEGER NOT NULL
      );
    `);
    await database.executeSql(`
      CREATE TABLE IF NOT EXISTS daily_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        check_in INTEGER NOT NULL,
        check_out INTEGER,
        synced INTEGER DEFAULT 0,
        UNIQUE(user_id, date)
      );
    `);
    console.log('Database initialized');
  },

  // ─── NEW: Check if face already enrolled ──────────────────────────────────
  // Returns the name of the matching person, or null if no match found
  async findDuplicateFace(newEmbedding: number[]): Promise<string | null> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT user_id, name, embedding FROM face_templates'
    );
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      const existingEmbedding: number[] = JSON.parse(row.embedding);
      const similarity = cosineSimilarity(newEmbedding, existingEmbedding);
      // If similarity > 0.70, it's the same person
      if (similarity > 0.92) {
        return row.name; // return the name they were enrolled as
      }
    }
    return null; // no duplicate found
  },

  async enrollUser(userId: string, embedding: number[]): Promise<void> {
    const database = await getDb();
    const embeddingJson = JSON.stringify(embedding);
    await database.executeSql(
      `INSERT OR REPLACE INTO face_templates 
       (user_id, name, embedding, enrolled_at) VALUES (?, ?, ?, ?)`,
      [userId, userId, embeddingJson, Date.now()]
    );
    console.log('User enrolled:', userId);
  },

  async getAllEmbeddings(): Promise<{ userId: string; embedding: number[] }[]> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT user_id, embedding FROM face_templates'
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      rows.push({ userId: row.user_id, embedding: JSON.parse(row.embedding) });
    }
    return rows;
  },

  async getEnrolledUsers(): Promise<{ userId: string; enrolledAt: number }[]> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT user_id, enrolled_at FROM face_templates ORDER BY name'
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      rows.push({ userId: row.user_id, enrolledAt: row.enrolled_at });
    }
    return rows;
  },

  // ─── NEW: Total enrolled workers count ────────────────────────────────────
  async getEnrolledCount(): Promise<number> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT COUNT(*) as count FROM face_templates'
    );
    return results.rows.item(0).count;
  },

  // ─── NEW: Pending sync count ───────────────────────────────────────────────
  async getPendingCount(): Promise<number> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT COUNT(*) as count FROM daily_attendance WHERE synced = 0'
    );
    return results.rows.item(0).count;
  },

  // ─── NEW: Today's attendance count ────────────────────────────────────────
  async getTodayCount(): Promise<number> {
    const database = await getDb();
    const today = dateKey(Date.now());
    const [results] = await database.executeSql(
      'SELECT COUNT(*) as count FROM daily_attendance WHERE date = ?',
      [today]
    );
    return results.rows.item(0).count;
  },

  async markAttendance(userId: string): Promise<'checkin' | 'checkout'> {
    const database = await getDb();
    const now = Date.now();
    const today = dateKey(now);
    const [existing] = await database.executeSql(
      'SELECT * FROM daily_attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    if (existing.rows.length === 0) {
      await database.executeSql(
        `INSERT INTO daily_attendance (user_id, date, check_in, synced) 
         VALUES (?, ?, ?, 0)`,
        [userId, today, now]
      );
      return 'checkin';
    } else {
      await database.executeSql(
        `UPDATE daily_attendance SET check_out = ?, synced = 0 
         WHERE user_id = ? AND date = ?`,
        [now, userId, today]
      );
      return 'checkout';
    }
  },

  // Explicit check-in or check-out based on requested mode
  async markAttendanceMode(
    userId: string,
    mode: 'checkin' | 'checkout'
  ): Promise<'checkin' | 'checkout' | 'already_in' | 'not_in'> {
    const database = await getDb();
    const now = Date.now();
    const today = dateKey(now);

    const [existing] = await database.executeSql(
      'SELECT * FROM daily_attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (mode === 'checkin') {
      if (existing.rows.length > 0) {
        return 'already_in'; // already checked in today
      }
      await database.executeSql(
        `INSERT INTO daily_attendance (user_id, date, check_in, synced)
         VALUES (?, ?, ?, 0)`,
        [userId, today, now]
      );
      return 'checkin';
    } else {
      if (existing.rows.length === 0) {
        return 'not_in'; // can't check out without checking in
      }
      await database.executeSql(
        `UPDATE daily_attendance SET check_out = ?, synced = 0
         WHERE user_id = ? AND date = ?`,
        [now, userId, today]
      );
      return 'checkout';
    }
  },

  // Get one day's record for a user (for the dashboard status)
  async getTodayRecord(userId: string): Promise<any | null> {
    const database = await getDb();
    const today = dateKey(Date.now());
    const [results] = await database.executeSql(
      'SELECT * FROM daily_attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    return results.rows.length > 0 ? results.rows.item(0) : null;
  },

  // Get all attendance dates for a user in a given month (year, month 0-11)
  // Returns a map of "YYYY-MM-DD" -> { check_in, check_out }
  async getMonthAttendance(
    userId: string,
    year: number,
    month: number
  ): Promise<Record<string, { check_in: number; check_out: number | null }>> {
    const database = await getDb();
    const mm = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${mm}-`;
    const [results] = await database.executeSql(
      `SELECT date, check_in, check_out FROM daily_attendance
       WHERE user_id = ? AND date LIKE ?`,
      [userId, prefix + '%']
    );
    const map: Record<string, { check_in: number; check_out: number | null }> = {};
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      map[row.date] = { check_in: row.check_in, check_out: row.check_out };
    }
    return map;
  },

  async getAttendanceForUser(userId: string): Promise<any[]> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT * FROM daily_attendance WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i));
    }
    return rows;
  },

  async getAttendanceCount(userId: string): Promise<number> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT COUNT(*) as count FROM daily_attendance WHERE user_id = ?',
      [userId]
    );
    return results.rows.item(0).count;
  },

  async getUnsyncedCount(): Promise<number> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT COUNT(*) as count FROM daily_attendance WHERE synced = 0'
    );
    return results.rows.item(0).count;
  },

  async syncAll(): Promise<void> {
    const database = await getDb();
    await database.executeSql(
      'UPDATE daily_attendance SET synced = 1 WHERE synced = 0'
    );
    console.log('All records synced');
  },
};