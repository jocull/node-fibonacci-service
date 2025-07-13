const fs = require('fs').promises;
const path = require('path');

function bigIntHexString(bigint) {
  const hex = bigint.toString(16);
  const paddedHex = '0x' + (hex.length % 2 ? '0' + hex : hex);
  return paddedHex;
}

function hexStringToBigint(hexStr) {
  return BigInt(hexStr);
}

(async () => {
  console.log(new Date(), 'Go');
  const filePath = path.resolve('.cache2/100000000');
  const lines = (await fs.readFile(filePath, 'utf-8'))
    .trim()
    .split('\n');
  console.log(new Date(), 'Read + Split');

  if (lines.length !== 4) {
    throw new Error(`Invalid file ${file} (expected 4 lines, got ${lines.length})`);
  }

  const [n, a, b, fn] = lines;
  const nInt = parseInt(n);
  console.log(new Date(), 'Parsed n', n, '@', fn.length);
  if (isNaN(nInt)) {
    console.warn(`Skipping invalid file ${file} (invalid n value: ${n})`);
    return;
  }

  const s1 = Date.now();
  const fnb = BigInt(fn);
  const e1 = Date.now();
  console.log(new Date(), 'Parsed fnb', e1 - s1);

  const s2 = Date.now();
  const fns = fnb.toString();
  const e2 = Date.now();
  console.log(new Date(), 'Stringified fns', fns.length, e2 - s2);

  const s3 = Date.now();
  const fnbb = bigIntHexString(fnb);
  const e3 = Date.now();
  console.log(new Date(), 'Buffered fnbb', fnbb.length, e3 - s3);
  console.log(fnbb.substring(0, 100));

  const s4 = Date.now();
  const fnbub = hexStringToBigint(fnb);
  const e4 = Date.now();
  console.log(new Date(), 'Unbuffered fnbub', fnbb.length, e4 - s4);
  console.log('Same?', fnb === fnbub);

  const filePath2 = path.resolve('.cache2/100000000x');
  const lines2 = [
    n.toString(),
    bigIntHexString(BigInt(a)),
    bigIntHexString(BigInt(b)),
    fnbub,
  ];
  await fs.writeFile(filePath2, lines2.join('\n'), 'utf-8');
  console.log(new Date(), 'Write + Split');
})();
