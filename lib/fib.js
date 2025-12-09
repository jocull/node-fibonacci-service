'use strict';

function yieldTime() {
  return new Promise((resolve) => setImmediate(resolve));
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

  const result = await fibonacciIterativeFastDoubling(inputN);
  return result.fn;
}

module.exports = { getFibonacci };
