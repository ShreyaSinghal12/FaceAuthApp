import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'faceauth.db', location: 'default' });
  return db;
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
      CREATE TABLE IF NOT EXISTS attendance_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    console.log('Database initialized');
  },

  async enrollUser(userId: string, embedding: number[]): Promise<void> {
    const database = await getDb();
    const embeddingJson = JSON.stringify(embedding);
    console.log('Saving to DB - userId:', userId, 'embedding length:', embedding.length);

    await database.executeSql(
      `INSERT OR REPLACE INTO face_templates 
       (user_id, name, embedding, enrolled_at) VALUES (?, ?, ?, ?)`,
      [userId, userId, embeddingJson, Date.now()]
    );

    const [check] = await database.executeSql(
      'SELECT COUNT(*) as count FROM face_templates'
    );
    console.log('Rows in face_templates after insert:', check.rows.item(0).count);
  },

  async getAllEmbeddings(): Promise<{ userId: string; embedding: number[] }[]> {
    const database = await getDb();

    const [countResult] = await database.executeSql(
      'SELECT COUNT(*) as count FROM face_templates'
    );
    console.log('Total rows in face_templates:', countResult.rows.item(0).count);

    const [results] = await database.executeSql(
      'SELECT user_id, embedding FROM face_templates'
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      rows.push({
        userId: row.user_id,
        embedding: JSON.parse(row.embedding),
      });
    }
    return rows;
  },

  async logAttendance(userId: string, name: string): Promise<void> {
    const database = await getDb();
    await database.executeSql(
      `INSERT INTO attendance_log (user_id, name, timestamp, synced) 
       VALUES (?, ?, ?, 0)`,
      [userId, name, Date.now()]
    );
    console.log('Attendance logged for:', name);
  },

  async getUnsyncedLogs(): Promise<any[]> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT * FROM attendance_log WHERE synced = 0'
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i));
    }
    return rows;
  },

  async markAsSynced(ids: number[]): Promise<void> {
    const database = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    await database.executeSql(
      `UPDATE attendance_log SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  },

  async purgeTemplates(): Promise<void> {
    const database = await getDb();
    await database.executeSql('DELETE FROM face_templates');
    console.log('Templates purged');
  },

  async getAttendanceLogs(): Promise<any[]> {
    const database = await getDb();
    const [results] = await database.executeSql(
      'SELECT * FROM attendance_log ORDER BY timestamp DESC LIMIT 50'
    );
    const rows = [];
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i));
    }
    return rows;
  },
};