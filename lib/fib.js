'use strict'

// Example (in Python):
// https://stackoverflow.com/a/22111492/97964
// 
// Beware Python operation evaluation ordering:
// https://stackoverflow.com/questions/8725673/multiple-assignment-and-evaluation-order-in-python
// 
// def fib(n):
//   a, b = 0, 1
//   while n > 0:
//     a, b = b, a+b
//     n -= 1
//   return a

// Remember that `n` is the suffix to use BigInt
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
function nextFibonacci(previous = null) {
  if (previous == null) {
    // Yield the first number (zero)
    return {
      a: 0n,
      b: 1n,
      n: 0n,
      fn: 0n,
    };
  }

  let newA = previous.b;
  let newB = previous.a + previous.b;
  return {
    a: newA,
    b: newB,
    n: previous.n + 1n,
    fn: newA,
  };
}

// We use setTimeout of 0 instead of process.nextTick
// because of how Node.js orders them in the event loop.
// This makes the process less greedy and will allow requests
// to complete out of cache.
//
// See: https://nodejs.dev/learn/understanding-process-nexttick
// Calling setTimeout(() => {}, 0) will execute the function at the end of next tick,
// much later than when using nextTick() which prioritizes the call and executes
// it just before the beginning of the next tick.
function beCooperative() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

const cache = [];

async function getFibonacci(inputIntString) {
  // Sanity checks and parsing
  if (typeof inputIntString !== 'string') {
    throw new Error('Input must be of string type');
  }
  const nBigInt = BigInt(inputIntString);
  if (nBigInt < 0n) {
    throw new Error('Input must be >= 0');
  }

  // Fibonacci work
  let previous = null;
  for (let item of cache) {
    if (item.n > nBigInt) {
      break;
    }
    previous = item;
  }

  let coopIterations = 0;
  while (previous == null || previous.n < nBigInt) {
    previous = nextFibonacci(previous);
    if (previous.n % 10000n == 0n) {
      // In the event that we are in a race, do not let cache add multiple entries for the same item
      if (!cache.some(x => x.n == previous.n)) {
        cache.push(previous);
      }
    }
    coopIterations++;
    if (coopIterations % 1000 == 0) {
      await beCooperative();
      coopIterations = 0;
    }
  }
  return previous.fn.toString();
}

module.exports = {
  getFibonacci,
};
