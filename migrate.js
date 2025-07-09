const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2');

const cacheDir = path.join(__dirname, '.cache'); // Adjust path as needed
const pool = mysql.createPool({
  host: 'localhost',
  user: 'appuser',
  password: 'Simplify4-Goon-Cheek',
  database: 'maindb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const insertQuery = `
  INSERT INTO fib_cache (n, a, b, fn)
  VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    a = VALUES(a),
    b = VALUES(b),
    fn = VALUES(fn)
`;

async function migrateCache() {
  try {
    const files = await fs.readdir(cacheDir);

    for (const file of files) {
      if (file.endsWith('.swp')) continue; // Skip swap files

      const filePath = path.join(cacheDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      if (lines.length !== 4) {
        console.warn(`Skipping invalid file ${file} (expected 4 lines, got ${lines.length})`);
        continue;
      }

      const [n, a, b, fn] = lines;
      const nInt = parseInt(n, 10);

      if (isNaN(nInt)) {
        console.warn(`Skipping invalid file ${file} (invalid n value: ${n})`);
        continue;
      }

      try {
        const conn = await pool.promise().getConnection();
        await conn.beginTransaction();

        try {
          await conn.query(insertQuery, [nInt, a, b, fn]);
          await conn.commit();
          console.log(`Upserted n=${nInt} from file ${file}`);
        } catch (err) {
          await conn.rollback();
          console.error(`Error upserting n=${nInt} from file ${file}:`, err);
        } finally {
          conn.release();
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
      }
    }

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    pool.end();
  }
}

migrateCache();
