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
    return await fp.getFibonacci(nStr);
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
        result: result.toString(),
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
