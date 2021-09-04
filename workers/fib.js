'use strict'

const bigInt = require('big-integer');
const _ = require('lodash');

module.exports = function (inputNumStr, callback) {
  let resultStr = fibonacciGetFromGenerator(inputNumStr);
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

// Use lodash's memoize to cache the string result of the input string.
// Using strings at the caching level cuts the objects in memory and let's us serve more numbers!
const fibonacciGetFromGenerator = _.memoize(function (inputIntString) {
  const nBigInt = bigInt(inputIntString);

  let result = null;
  do {
    result = fibonacciGenerator.next().value;
  } while (result.n.lt(nBigInt));

  return result.fn.toString();
});
