'use strict';

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./fib_cache.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS fib_cache (n INTEGER PRIMARY KEY, a TEXT, b TEXT, fn TEXT)");
    });
  }
});

// Function to compute the next Fibonacci state
function nextFibonacci(previous = null) {
  if (previous == null) {
    return {
      a: 0n,
      b: 1n,
      n: 0,
      fn: 0n,
    };
  }
  const newA = previous.b;
  const newB = previous.a + previous.b;
  return {
    a: newA,
    b: newB,
    n: previous.n + 1, // + 1 because it needs to not impact the value of `previous.n`
    fn: newA,
  };
}

// Main function to compute Fibonacci number
async function getFibonacci(inputNString) {
  const inputN = Number.parseInt(inputNString);
  if (inputN < 0 || inputN > Number.MAX_SAFE_INTEGER) {
    throw new Error('Input must be >= 0 and < ' + Number.MAX_SAFE_INTEGER);
  }

  // Query the database for the last known state
  let previous = null;
  try {
    const row = await new Promise((resolve, reject) => {
      const stmt = db.prepare("SELECT * FROM fib_cache WHERE n <= ? ORDER BY n DESC LIMIT 1");
      stmt.get(Number(inputN), (err, row) => {
        stmt.finalize();
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (row) {
      previous = {
        a: BigInt(row.a),
        b: BigInt(row.b),
        n: Number(row.n),
        fn: BigInt(row.fn),
      };
    }
  } catch (err) {
    console.error('Error querying database:', err);
    throw err;
  }

  while (previous == null || previous.n < inputN) {
    previous = nextFibonacci(previous);

    // Insert into the database every 10,000 steps
    if (previous.n % 10000 == 0) {
      console.log("Checkpoint", previous.n);
      try {
        await new Promise((resolve, reject) => {
          const stmt = db.prepare("INSERT OR IGNORE INTO fib_cache (n, a, b, fn) VALUES (?, ?, ?, ?)");
          stmt.run(
            previous.n,
            previous.a.toString(),
            previous.b.toString(),
            previous.fn.toString(),
            (err) => {
              stmt.finalize();
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
      } catch (err) {
        console.error('Error inserting into database:', err);
        throw err;
      }
    }
  }

  // Ensure the final state is saved to the database
  try {
    await new Promise((resolve, reject) => {
      const stmt = db.prepare("INSERT OR IGNORE INTO fib_cache (n, a, b, fn) VALUES (?, ?, ?, ?)");
      stmt.run(
        previous.n,
        previous.a.toString(),
        previous.b.toString(),
        previous.fn.toString(),
        (err) => {
          stmt.finalize();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  } catch (err) {
    console.error('Error inserting final entry into database:', err);
    throw err;
  }

  return previous.fn.toString();
}

module.exports = { getFibonacci };