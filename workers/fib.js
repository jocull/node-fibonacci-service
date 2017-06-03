'use strict'

const bigInt = require('big-integer');
const fibCache = new Map();

module.exports = function (inputNumStr, callback) {
  let inputBigInt = bigInt(inputNumStr.toString());
  let resultBigInt = fibonacciGetFromGenerator(inputBigInt);
  let resultStr = resultBigInt.toString();
  callback(null, resultStr);
};

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

function fibonacciFn(nBigInt) {
  let a = bigInt.zero;
  let b = bigInt.one;
  let n = nBigInt;

  while (n.gt(bigInt.zero)) {
    let newA = b;
    let newB = a.add(b);
    a = newA;
    b = newB;
    n = n.subtract(bigInt.one);
  }

  return a;
}

const fibonacciGenerator = (function* () {
  let a = bigInt.zero;
  let b = bigInt.one;
  let n = bigInt.zero;

  // Yield the first number (zero)
  yield {
    n: n,
    fn: a,
  };

  while (true) {
    let newA = b;
    let newB = a.add(b);
    a = newA;
    b = newB;
    n = n.add(bigInt.one);
    yield {
      n: n,
      fn: a,
    };
  }
})();

function fibonacciGetFromGenerator(nBigInt) {
  let result = fibCache.get(nBigInt.toString());
  if (result) {
    return result.fn;
  }

  do {
    result = fibonacciGenerator.next().value;
    fibCache.set(result.n.toString(), result);
  } while (result.n.lt(nBigInt));

  return result.fn;
}
