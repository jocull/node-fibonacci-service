'use strict'

const express = require('express');
const router = express.Router();

const Promise = require('bluebird');
const bigInt = require('big-integer');
const workerFarm = require('worker-farm');
const workers = Promise.promisify(workerFarm({
                    autoStart: true,
                    maxConcurrentWorkers: 1,
                    maxRetries: 1,
                  },
                  require.resolve('../workers/fib')));

const LIMIT = bigInt('200000');

router.get('/', function (req, res) {
  res.status(200)
    .send({
      status: 'ok!',
    });
});

function getFib(nStr) {
  return Promise.try(() => {
      if (typeof nStr !== 'string') {
        throw new 'Input must be of string type';
      }

      // bigInt throws strings on parsing failure, not errors
      let nBigInt = bigInt(nStr);
      if (nBigInt.lt(bigInt.zero)) {
        throw 'Input must be >= 0';
      } else if (nBigInt.gt(LIMIT)) {
        throw `Sorry! Can't generate higher than ${LIMIT.toString()} unless you raise the limit (see code)`;
      }
      return nBigInt.toString();
    })
    .then(workers)
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
