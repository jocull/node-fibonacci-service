const fs = require('fs').promises;
const path = require('path');

const { compress, decompress } = require('@mongodb-js/zstd');

const fib = require('./lib/fib');

const cacheDir = path.resolve('.cache');
(async () => {
  console.log(new Date(), 'Go');
  const fibN = await fib.readCacheFile(cacheDir, 100000000);
  console.log(new Date(), 'Read File');

  const cl = 3;

  const fns = fibN.fn.toString();
  const fnb = Buffer.from(fns);
  console.log(new Date(), 'Converted to base10 buffer', fnb.length, 'vs', (await compress(fnb, cl)).length);

  const fns64 = fib.bigIntToBase64String(fibN.fn);
  const fnb64 = Buffer.from(fns64);
  console.log(new Date(), 'Converted to base64 buffer', fnb64.length, 'vs', (await compress(fnb64, cl)).length);

  const s1 = Date.now();
  const fnbc = await compress(fnb, cl);
  const e1 = Date.now();
  console.log(new Date(), 'Compressed fnbc', fnb.length, 'vs', fnbc.length, 'in', e1 - s1);
  console.log('Ratio:', (fnbc.length / fnb.length));

  const s2 = Date.now();
  const fnbd = await decompress(fnbc);
  const e2 = Date.now();
  console.log(new Date(), 'Decompressed fnbd', fnbd.length, 'again', 'in', e2 - s2);

  const s3 = Date.now();
  const fnr = BigInt(fnbd.toString());
  const e3 = Date.now();
  console.log(new Date(), 'Restored fnr', 'in', e3 - s3);
  console.log('Same?', fibN.fn === fnr);
})();
