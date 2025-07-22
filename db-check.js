const fs = require('fs').promises;
const path = require('path');

const config = require('config');
const mysql = require('mysql2');

const tableName = config?.app?.cacheTable || 'fib_cache';
console.log('Using table name:', tableName);

const pool = mysql.createPool({
  host: config?.mysql?.host || 'localhost',
  user: config?.mysql?.user,
  password: config?.mysql?.password,
  database: config?.mysql?.database,
  waitForConnections: config?.mysql?.waitForConnections || true,
  connectionLimit: config?.mysql?.connectionLimit || 10,
  queueLimit: config?.mysql?.queueLimit || 0,
});

(async function main() {
  try {
    const conn = await pool.promise().getConnection();
    try {
      console.log('Starting gap check...');
      const [rows] = await conn.query(`SELECT n FROM ${tableName} ORDER BY n`);
      const nList = rows.map(r => r.n);
      const gaps = [];
      const interval = 10_000;
      if (nList.length > 0) {
        console.log(nList.length, 'rows to check');
        const nMin = nList[0], nMax = nList[nList.length - 1];
        let nCheck = nMin;
        for (let n of nList) {
          if (n != nCheck) {
            const gapSize = (n - nCheck) / interval;
            console.warn('Found gap at', n, 'with size', gapSize, '(', nCheck, 'vs', n, ')');
            gaps.push([nCheck, n]);
            nCheck = n; // Realign to check next gap
          }
          nCheck += interval; // Next expected
        }
      }
      console.log('Gap check complete.');
      if (gaps.length > 0) {
        console.warn('Found gaps:', gaps);
      } else {
        console.log('No gaps detected.');
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Error during DB checking:", err);
    throw err;
  } finally {
    pool.end();
  }
})();
