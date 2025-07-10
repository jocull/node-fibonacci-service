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
  INSERT IGNORE INTO fib_cache (n, a, b, fn)
  VALUES (?, ?, ?, ?)
`.trim();

// Function to process files in batches
async function processWithLimit(tasks, limit) {
  let index = 0;
  while (index < tasks.length) {
    const batch = tasks.slice(index, index + limit);
    await Promise.all(batch.map(task => task()));
    index += limit;
  }
}

async function migrateCache() {
  try {
    // Start with the largest files first and work backwards numerically
    const files = (await fs.readdir(cacheDir))
      .filter(file => !file.endsWith('.swp'))
      .map(file => parseInt(file))
      .sort()
      .reverse()
      .map(file => file.toString());
    let fileCounter = 0;
    const tasks = files.map(file => async () => {
      if (file.endsWith('.swp')) return;

      try {
        const filePath = path.join(cacheDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        if (lines.length !== 4) {
          throw new Error(`Invalid file ${file} (expected 4 lines, got ${lines.length})`)
        }

        const [n, a, b, fn] = lines;
        const nInt = parseInt(n, 10);

        if (isNaN(nInt)) {
          console.warn(`Skipping invalid file ${file} (invalid n value: ${n})`);
          return;
        }

        const conn = await pool.promise().getConnection();
        try {
          const countRows = await conn.query(`SELECT count(*) as c FROM fib_cache WHERE n = ?`, [nInt]);
          const count = countRows[0][0].c;
          if (count > 0) {
            console.log('Exists: n=', nInt, ++fileCounter, files.length, new Date());
          } else {
            await conn.query(insertQuery, [nInt, a, b, fn]);
            console.log(`Added n=${nInt} from file ${file}`, ++fileCounter, files.length, new Date());
          }
        } finally {
          conn.release();
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        throw err;
      }
    });

    await processWithLimit(tasks, 4);

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Error during migration:", err);
    throw err;
  } finally {
    pool.end();
  }
}

migrateCache();
