'use strict'

const express = require('express');
const router = express.Router();

const fp = require('../lib/fib-pool');

router.get('/', function (req, res) {
  res.status(200)
    .send({
      status: 'ok!',
    });
});

async function getFibonacci(nStr) {
  try {
    // Convert the result to a base10 string within the worker thread.
    // String conversion can take a long time, even exceeding the time
    // to actually calculate the number, so this avoids us tying
    // up the main thread with stringification.
    return await fp.getFibonacci(nStr, 'base10');
  } catch (err) {
    // Rethrow for higher handler
    err.status = 400;
    throw err;
  }
}

router.get('/fib/:fib', async function (req, res, next) {
  try {
    const result = await getFibonacci(req.params.fib)
    res.status(200)
      .send({
        result: result,
      });
  } catch (err) {
    next(err);
  }
});

router.get('/fib/*', async function (req, res, next) {
  try {
    const nFibs = req.params['0'].split('/');
    const results = [];
    for (let nStr of nFibs) {
      const result = await getFibonacci(nStr);
      results.push({
        n: nStr,
        fn: result,
      });
    }

    const output = results.reduce((acc, val) => {
      acc[val.n] = val.fn;
      return acc;
    }, {});

    res.status(200)
      .send({
        result: output,
      });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
