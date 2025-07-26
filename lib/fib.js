'use strict';
const fs = require('fs').promises;
const path = require('path');

const config = require('config');
const mysql = require('mysql2');

const tableName = config?.app?.cacheTable || 'fib_cache';
console.log('Using table name:', tableName);

const pool = mysql.createPool({
  host: config?.mysql?.host || 'localhost',
  user: config?.mysql?.user,
  password: config?.mysql?.password,
  database: config?.mysql?.database,
  waitForConnections: config?.mysql?.waitForConnections || true,
  connectionLimit: config?.mysql?.connectionLimit || 10,
  queueLimit: config?.mysql?.queueLimit || 0,
});

function bigIntToBase64String(bigint) {
  const hex = bigint.toString(16);
  const paddedHex = (hex.length % 2 ? '0' + hex : hex);
  const buffer = Buffer.from(paddedHex, 'hex');
  return buffer.toString('base64');
}

function bigIntFromBase64String(base64Str) {
  const buffer = Buffer.from(base64Str, 'base64');
  return BigInt('0x' + buffer.toString('hex'));
}

function yieldTime() {
  return new Promise((resolve) => setImmediate(resolve));
}

function toFileObject(previous) {
  return {
    n: String(previous.n),
    a: bigIntToBase64String(previous.a),
    b: bigIntToBase64String(previous.b),
    fn: bigIntToBase64String(previous.fn),
    format: 'base64', // file format line, not present in older cache files
  };
}

function fromFileObject(fileObject) {
  // Assume decimal format for back compatibility if not present
  if (!fileObject.format) {
    fileObject.format = 'decimal';
  }
  if (fileObject.format == 'base64') {
    return {
      n: Number(fileObject.n),
      a: bigIntFromBase64String(fileObject.a),
      b: bigIntFromBase64String(fileObject.b),
      fn: bigIntFromBase64String(fileObject.fn),
    };
  } else if (fileObject.format == 'decimal') {
    return {
      n: Number(fileObject.n),
      a: BigInt(fileObject.a),
      b: BigInt(fileObject.b),
      fn: BigInt(fileObject.fn),
    };
  } else {
    throw new Error(`Unknown format: ${format}`);
  }
}

async function getBestCacheEntryDatabase(n) {
  const conn = await pool.promise().getConnection();
  try {
    // Support legacy 'decimal' format vs 'base64'
    const [[row]] = await conn.query(
      `SELECT n, a, b, fn, format
      FROM ${tableName}
      WHERE n <= ?
      ORDER BY n desc
      LIMIT 0, 1`, [n]);

    if (!row) {
      // No previous
      return null;
    }
    return fromFileObject(row);
  } finally {
    conn.release();
  }
}

const insertQuery = `
  REPLACE INTO ${tableName} (n, a, b, fn, format)
  VALUES (?, ?, ?, ?, ?)
`.trim();

async function writeCacheDatabase(previous, fileObject) {
  const conn = await pool.promise().getConnection();
  try {
    // Support legacy 'decimal' format vs 'base64'
    await conn.query(insertQuery, [
      previous.n,
      fileObject.a,
      fileObject.b,
      fileObject.fn,
      fileObject.format,
    ]);
  } finally {
    conn.release();
  }
}

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

async function fibonacciIterativeFastDoubling(n) {
  if (n == null || n == 0) {
    return {
      a: 0n,
      b: 1n,
      n: 0,
      fn: 0n,
    };
  }

  let a = 1n, b = 1n;
  const binary = n.toString(2);
  for (let i = 1; i < binary.length; i++) {
    const bit = binary[i];
    const c = a * (2n * b - a);
    const d = a * a + b * b;

    if (bit === '1') {
      a = d;
      b = c + d;
    } else {
      a = c;
      b = d;
    }

    // Right now we yield after each calculation, since they get longer and longer
    // in ways we can't otherwise control. It did not seem to add significant overhead
    // to higher tier numbers and allows us to offload some I/O time.
    //
    // It's not really clear if the I/O time savings are actually worth it
    // on fast hardware, but I think this might really depend on the speed, memory,
    // and network connections between the devices we end up writing to
    // and the hardware both are running on.
    if (i > 0 && i % 2 == 0) {
      await yieldTime();
    }
  }
  return {
    a: a,
    b: b,
    n: n,
    fn: a,
  };
}

// Main function to compute Fibonacci number
async function getFibonacci(inputNString) {
  const inputN = Number.parseInt(inputNString);
  if (inputN < 0 || inputN > Number.MAX_SAFE_INTEGER) {
    throw new Error('Input must be >= 0 and < ' + Number.MAX_SAFE_INTEGER);
  }

  // Find the maximum n in the cache that is <= inputN
  let previous = null;
  try {
    console.info(new Date(), 'Checking database for best checkpoint...');
    previous = await getBestCacheEntryDatabase(inputN);
    if (previous != null) {
      console.info(new Date(), 'Resuming from checkpoint', previous.n);
    }
  } catch (err) {
    console.error('Error reading cache files:', err);
    throw err;
  }

  if (inputN % 10_000 != 0) {
    // TODO: Temporarily not supported
    throw new Error("Unsupported modulus: " + inputN);
  }

  // Compute Fibonacci numbers up to inputN
  let lastComputeTime = Date.now();
  let lastCycleTime = Date.now();
  while (previous == null || previous.n < inputN) {
    const nextN = previous != null ? previous.n + 10_000 : 0;
    previous = await fibonacciIterativeFastDoubling(nextN);

    // Write to cache every 10,000 steps
    if (previous.n % 10_000 === 0) {
      // Fire as an async task.
      // We need to retain `previous` at this state for the lambda below,
      // thus we make `taskPrevious`
      const taskPrevious = { ...previous };
      (async () => {
        console.log(new Date(), 'Checkpoint. Serializing...', taskPrevious.n);
        const fileObject = toFileObject(taskPrevious);
        console.log(new Date(), '...compute time:', (Date.now() - lastComputeTime));
        lastComputeTime = Date.now();

        console.log(new Date(), '...write to database begins...', taskPrevious.n);
        const taskWriteTime = Date.now();
        await writeCacheDatabase(taskPrevious, fileObject);
        console.log(new Date(), '...database write complete', taskPrevious.n);
        console.log(new Date(), '...database write time:', (Date.now() - taskWriteTime));
        console.log(new Date(), '...cycle time:', (Date.now() - lastCycleTime));
        lastCycleTime = Date.now();
      })();
    }
  }
}

module.exports = { getFibonacci };
