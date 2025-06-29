'use strict';

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./fib_cache.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS fib_cache (n TEXT PRIMARY KEY, a TEXT, b TEXT, fn TEXT)");
    });
  }
});

// Function to compute the next Fibonacci state
function nextFibonacci(previous = null) {
  if (previous == null) {
    return {
      a: 0n,
      b: 1n,
      n: 0n,
      fn: 0n,
    };
  }
  const newA = previous.b;
  const newB = previous.a + previous.b;
  return {
    a: newA,
    b: newB,
    n: previous.n + 1n,
    fn: newA,
  };
}

// Helper to yield control to the event loop
function beCooperative() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Main function to compute Fibonacci number
async function getFibonacci(inputIntString) {
  if (typeof inputIntString !== 'string') {
    throw new Error('Input must be of string type');
  }

  const nBigInt = BigInt(inputIntString);
  if (nBigInt < 0n) {
    throw new Error('Input must be >= 0');
  }

  // Query the database for the last known state
  let previous = null;
  try {
    const row = await new Promise((resolve, reject) => {
      const stmt = db.prepare("SELECT * FROM fib_cache WHERE n <= ? ORDER BY n DESC LIMIT 1");
      stmt.get(nBigInt.toString(), (err, row) => {
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
        n: BigInt(row.n),
        fn: BigInt(row.fn),
      };
    }
  } catch (err) {
    console.error('Error querying database:', err);
    throw err;
  }

  let coopIterations = 0;
  while (previous == null || previous.n < nBigInt) {
    previous = nextFibonacci(previous);

    // Insert into the database every 10,000 steps
    if (previous.n % 10000n === 0n) {
      console.log("Checkpoint", previous.n);
      try {
        await new Promise((resolve, reject) => {
          const stmt = db.prepare("INSERT OR IGNORE INTO fib_cache (n, a, b, fn) VALUES (?, ?, ?, ?)");
          stmt.run(
            previous.n.toString(),
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

    // Yield control every 1000 iterations
    coopIterations++;
    if (coopIterations % 1000 === 0) {
      try {
        await beCooperative();
      } catch (err) {
        console.error('Error during beCooperative:', err);
        throw err;
      }
      coopIterations = 0;
    }
  }

  // Ensure the final state is saved to the database
  try {
    await new Promise((resolve, reject) => {
      const stmt = db.prepare("INSERT OR IGNORE INTO fib_cache (n, a, b, fn) VALUES (?, ?, ?, ?)");
      stmt.run(
        previous.n.toString(),
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