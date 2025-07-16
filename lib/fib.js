'use strict';
const fs = require('fs').promises;
const path = require('path');

function bigIntToHexBuffer(bigint) {
  const hex = bigint.toString(16);
  const paddedHex = (hex.length % 2 ? '0' + hex : hex);
  return Buffer.from(paddedHex, 'hex');
}

function bigIntToBase64String(bigint) {
  return bigIntToHexBuffer(bigint).toString('base64');
}

function bigIntFromHexBuffer(buffer) {
  return BigInt('0x' + buffer.toString('hex'));
}

function bigIntFromBase64String(base64Str) {
  const buffer = Buffer.from(base64Str, 'base64');
  return bigIntFromHexBuffer(buffer);
}

function yieldTime() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function readCacheFile(cacheDir, n) {
  const filePath = path.join(cacheDir, `${n}`);
  const data = await fs.readFile(filePath, 'utf8');
  const lines = data.split('\n');

  if (lines.length < 4) {
    throw new Error(`File ${filePath} does not have the correct format (${lines.length})`);
  }

  // Assume decimal format for back compatibility if not present
  const format = lines[4] || 'decimal';
  if (format == 'base64') {
    return {
      n: Number(lines[0]),
      a: bigIntFromBase64String(lines[1]),
      b: bigIntFromBase64String(lines[2]),
      fn: bigIntFromBase64String(lines[3]),
    };
  } else if (format == 'decimal') {
    return {
      n: Number(lines[0]),
      a: BigInt(lines[1]),
      b: BigInt(lines[2]),
      fn: BigInt(lines[3]),
    };
  } else {
    throw new Error(`Unknown format: ${format}`);
  }
}

async function writeCacheFile(cacheDir, previous) {
  try {
    const content = [
      previous.n.toString(),
      bigIntToBase64String(previous.a),
      bigIntToBase64String(previous.b),
      bigIntToBase64String(previous.fn),
      'base64', // file format line, not present in older cache files
    ].join('\n');
    // Using swap files makes operations more atomic to avoid partial writes
    const filePath = path.join(cacheDir, `${previous.n}`);
    const filePathSwap = `${filePath}.swp`;
    await fs.writeFile(filePathSwap, content, 'utf8');
    await fs.rename(filePathSwap, filePath);
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
    // Right now we yield after each calculation, since they get longer and longer
    // in ways we can't otherwise control. It did not seem to add significant overhead
    // to higher tier numbers and allows us to offload some I/O time.
    //
    // It's not really clear if the I/O time savings are actually worth it
    // on fast hardware, but I think this might really depend on the speed, memory,
    // and network connections between the devices we end up writing to
    // and the hardware both are running on.
    await yieldTime();

    // Write to cache every 10,000 steps
    if (previous.n % 10_000 === 0) {
      // Fire as an async task.
      // We need to retain `previous` at this state for the lambda below,
      // thus we make `taskPrevious`
      const taskPrevious = { ...previous };
      (async () => {
        console.log("Checkpoint", taskPrevious.n, new Date());
        await writeCacheFile(cacheDir, taskPrevious);
        console.log("...complete", taskPrevious.n, new Date());

        // Read it back to validate writes
        const written = await readCacheFile(cacheDir, taskPrevious.n);
        if (written.fn !== taskPrevious.fn) {
          console.error('Expected:', taskPrevious.fn);
          console.error('Received:', written.fn);
          throw new Error('Write valdiation failed!');
        }
        console.log("...write validated", taskPrevious.n, new Date());
      })();
    }
  }
}

module.exports = {
  getFibonacci,
  readCacheFile,
  writeCacheFile,
  bigIntToHexBuffer,
  bigIntFromBase64String,
  bigIntFromHexBuffer,
  bigIntToBase64String,
};
