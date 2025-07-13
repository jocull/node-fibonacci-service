'use strict';
const fs = require('fs').promises;
const path = require('path');

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

async function readCacheFile(cacheDir, n) {
  const filePath = path.join(cacheDir, `${n}`);
  const data = await fs.readFile(filePath, 'utf-8');
  const lines = data.split('\n');

  if (lines.length === 4) {
    return {
      n: Number(lines[0]),
      a: bigIntFromBase64String(lines[1]),
      b: bigIntFromBase64String(lines[2]),
      fn: bigIntFromBase64String(lines[3]),
    };
  };
}

async function writeCacheFile(cacheDir, previous) {
  try {
    const content = [
      previous.n.toString(),
      bigIntToBase64String(previous.a),
      bigIntToBase64String(previous.b),
      bigIntToBase64String(previous.fn),
    ].join('\n');
    // Using swap files makes operations more atomic to avoid partial writes
    const filePath = path.join(cacheDir, `${previous.n}`);
    const filePathSwap = `${filePath}.swp`;
    await fs.writeFile(filePathSwap, content);
    await fs.rename(filePathSwap, filePath);
    console.log("...complete", previous.n, new Date());
  } catch (err) {
    console.error('Error writing to cache:', err);
    throw err;
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

// Main function to compute Fibonacci number
async function getFibonacci(inputNString) {
  const inputN = Number.parseInt(inputNString);
  if (inputN < 0 || inputN > Number.MAX_SAFE_INTEGER) {
    throw new Error('Input must be >= 0 and < ' + Number.MAX_SAFE_INTEGER);
  }

  // Create or ensure the .cache directory exists
  const cacheDir = path.join(process.cwd(), '.cache');
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    console.error('Error creating cache directory:', err);
    throw err;
  }

  // Find the maximum n in the cache that is <= inputN
  let previous = null;
  try {
    const files = await fs.readdir(cacheDir);
    let maxN = -1;

    for (const file of files) {
      const nStr = path.basename(file);
      const n = Number(nStr);
      if (!Number.isNaN(n) && n <= inputN && n > maxN) {
        maxN = n;
      }
    }

    if (maxN >= 0) {
      previous = await readCacheFile(cacheDir, maxN);
    }
  } catch (err) {
    console.error('Error reading cache files:', err);
    throw err;
  }

  // Compute Fibonacci numbers up to inputN
  while (previous == null || previous.n < inputN) {
    previous = nextFibonacci(previous);

    // Write to cache every 10,000 steps
    if (previous.n % 10_000 === 0) {
      console.log("Checkpoint", previous.n, new Date());
      await writeCacheFile(cacheDir, previous);

      // Read it back to validate writes
      const written = await readCacheFile(cacheDir, previous.n);
      if (written.fn !== previous.fn) {
        console.error('Expected:', previous.fn);
        console.error('Received:', written.fn);
        throw new Error('Write valdiation failed!');
      }
    }
  }
}

module.exports = { getFibonacci };
