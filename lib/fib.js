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
const fibonacciGenerator = (function* () {
  let a = 0n;
  let b = 1n;
  let n = 0n;

  // Yield the first number (zero)
  yield {
    n: n,
    fn: a,
  };

  while (true) {
    let newA = b;
    let newB = a + b;
    a = newA;
    b = newB;
    n = n + 1n;
    yield {
      n: n,
      fn: a,
    };
  }
})();

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

const cache = {};
let maxCachedN = null;

async function getFibonacci(inputIntString) {
  let result = cache[inputIntString];
  if (result != null) {
    return result.toString();
  }

  let coopIterations = 0;
  const nBigInt = BigInt(inputIntString);
  while (maxCachedN == null || maxCachedN < nBigInt) {
    coopIterations++;
    if (coopIterations % 1000 == 0) {
      await beCooperative();
      coopIterations = 0;
    }
    result = fibonacciGenerator.next().value;
    cache[result.n.toString()] = result.fn;
    maxCachedN = result.n;
  }

  return cache[inputIntString].toString();
}

module.exports = {
  getFibonacci,
};
