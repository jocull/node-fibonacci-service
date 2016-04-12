function fibonacciFlat(n) {
    if (n <= 1) {
        return 0;
    }

    var first = 0, second = 1, fib = 0;
    for (var i = 2; i < n; i++) {
        fib = first + second;
        first = second;
        second = fib;
    }
    return fib;
}

function fibonacciRecursive(num) {
  if (num <= 1) return 1;

  return fibonacciRecursive(num - 1) + fibonacciRecursive(num - 2);
}

module.exports = function (input, callback) {
    var result = fibonacciRecursive(input);
    callback(null, result);
};
