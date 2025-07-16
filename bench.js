const fs = require('fs').promises;
const path = require('path');

const { compress, decompress } = require('@mongodb-js/zstd');

const fib = require('./lib/fib');

const cacheDir = path.resolve('.cache');
(async () => {
  console.log(new Date(), 'Go');
  const fibN = await fib.readCacheFile(cacheDir, 100000000);
  console.log(new Date(), 'Read File');

  const s1 = Date.now();
  const fnb = fib.bigIntToHexBuffer(fibN.fn);
  const fnbc = await compress(fnb, 3);
  const e1 = Date.now();
  console.log(new Date(), 'Compressed fnbc', fnb.length, 'vs', fnbc.length, 'in', e1 - s1);
  console.log('Ratio:', (fnbc.length / fnb.length));

  const s2 = Date.now();
  const fnbd = await decompress(fnbc);
  const e2 = Date.now();
  console.log(new Date(), 'Decompressed fnbd', fnbd.length, 'again', 'in', e2 - s2);

  const s3 = Date.now();
  const fnr = fib.bigIntFromHexBuffer(fnbd);
  const e3 = Date.now();
  console.log(new Date(), 'Restored fnr', 'in', e3 - s3);
  console.log('Same?', fibN.fn === fnr);
})();
