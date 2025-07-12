const fs = require('fs').promises;
const path = require('path');

const config = require('config');
const mysql = require('mysql2');

const cacheDir = path.resolve(config.app.cacheDir || './.cache');
console.log('Using cache dir:', cacheDir);

const pool = mysql.createPool({
  host: config.mysql.host || 'localhost',
  user: config.mysql.user || 'appuser',
  password: config.mysql.password || 'Simplify4-Goon-Cheek',
  database: config.mysql.database || 'maindb',
  waitForConnections: config.mysql.waitForConnections || true,
  connectionLimit: config.mysql.connectionLimit || 10,
  queueLimit: config.mysql.queueLimit || 0,
});

const existQuery = `
  SELECT count(*) as c
  FROM fib_cache
  WHERE n = ?
`.trim();

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
      .sort((a, b) => b - a)
      .map(file => file.toString());
    const fileCounter = { c: 0 };
    const tasks = files.map(file => async () => {
      try {
        const thisFileCount = fileCounter.c++;
        // Match query
        {
          const nInt = parseInt(file);
          if (isNaN(nInt)) {
            throw new Error(`Invalid file ${file} (didn't parse)`);
          }
          const conn = await pool.promise().getConnection();
          try {
            const countRows = await conn.query(existQuery, [nInt]);
            const count = countRows[0][0].c;
            if (count > 0) {
              console.log('Exists: n=', nInt, thisFileCount, files.length, new Date());
              return;
            }
          } finally {
            conn.release();
          }
        }

        // Insert query
        {
          const filePath = path.join(cacheDir, file);
          const lines = (await fs.readFile(filePath, 'utf-8'))
            .trim()
            .split('\n');

          if (lines.length !== 4) {
            throw new Error(`Invalid file ${file} (expected 4 lines, got ${lines.length})`);
          }

          const [n, a, b, fn] = lines;
          const nInt = parseInt(n);
          if (isNaN(nInt)) {
            console.warn(`Skipping invalid file ${file} (invalid n value: ${n})`);
            return;
          }

          const conn = await pool.promise().getConnection();
          try {
            await conn.query(insertQuery, [nInt, a, b, fn]);
            console.log(`Added n=${nInt} from file ${file}`, thisFileCount, files.length, new Date());
          } finally {
            conn.release();
          }
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        throw err;
      }
    });

    await processWithLimit(tasks, config.migrate.concurrent || 1);

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Error during migration:", err);
    throw err;
  } finally {
    pool.end();
  }
}

migrateCache();
