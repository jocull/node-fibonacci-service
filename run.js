const fs = require('fs').promises;
const fib = require('./lib/fib');

(async function () {
    var fibN = await fib.getFibonacci(90_000_000);
})();
