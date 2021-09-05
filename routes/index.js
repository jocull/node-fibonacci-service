'use strict'

const express = require('express');
const router = express.Router();

const { getFibonacci } = require('../lib/fib');

const LIMIT = 350000n;

router.get('/', function (req, res) {
  res.status(200)
    .send({
      status: 'ok!',
    });
});

function getFib(nStr) {
  return Promise.resolve()
    .then(() => {
      if (typeof nStr !== 'string') {
        throw new 'Input must be of string type';
      }

      // bigInt throws strings on parsing failure, not errors
      let nBigInt = BigInt(nStr);
      if (nBigInt < 0n) {
        throw 'Input must be >= 0';
      } else if (nBigInt > LIMIT) {
        throw `Sorry! Can't generate higher than ${LIMIT.toString()} unless you raise the limit (see code)`;
      }
      return nBigInt.toString();
    })
    .then(inputIntString => getFibonacci(inputIntString))
    .catch(errString => {
      // Rethrow for higher handler
      let e = new Error(errString);
      e.status = 400;
      throw e;
    });
}

router.get('/fib/:fib', function (req, res, next) {
  return getFib(req.params.fib)
    .then(result => {
      res.status(200)
        .send({
          result,
        });
    })
    .catch(err => {
      next(err);
    });
});

router.get('/fib/*', function (req, res, next) {
  let nFibs = req.params['0'].split('/');
  return Promise.map(nFibs, nStr => {
      return getFib(nStr)
        .then(result => ({
          n: nStr,
          fn: result,
        }));
    })
    .then(results => {
      let result = results.reduce((acc, val) => {
        acc[val.n] = val.fn;
        return acc;
      }, {});

      res.status(200)
        .send({
          result,
        });
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
