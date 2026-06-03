import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'faceauth.db', location: 'default' });
  return db;
};

// Returns YYYY-MM-DD for a timestamp
const dateKey = (ts: number): string => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    // Daily attendance: one row per person per day
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

  // Get list of all enrolled people
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

  // Mark attendance: first scan of day = check-in, later scans update check-out
  async markAttendance(userId: string): Promise<'checkin' | 'checkout'> {
    const database = await getDb();
    const now = Date.now();
    const today = dateKey(now);

    // Check if a record exists for today
    const [existing] = await database.executeSql(
      'SELECT * FROM daily_attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (existing.rows.length === 0) {
      // First scan today = check-in
      await database.executeSql(
        `INSERT INTO daily_attendance (user_id, date, check_in, synced) 
         VALUES (?, ?, ?, 0)`,
        [userId, today, now]
      );
      return 'checkin';
    } else {
      // Subsequent scan = update check-out
      await database.executeSql(
        `UPDATE daily_attendance SET check_out = ?, synced = 0 
         WHERE user_id = ? AND date = ?`,
        [now, userId, today]
      );
      return 'checkout';
    }
  },

  // Get all attendance days for a specific person
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

  // Count distinct attendance days for a person
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
    await database.executeSql('UPDATE daily_attendance SET synced = 1 WHERE synced = 0');
    console.log('All records synced');
  },
};