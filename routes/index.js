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

router.get('/', function (req, res) {
  res.status(200)
    .send({
      status: 'ok!',
    });
});

const LIMIT = bigInt('200000');

router.get('/fib/:fib', function (req, res, next) {
  return Promise.resolve()
    .then(() => {
      return Promise.try(() => {
          // bigInt throws strings on parsing failure, not errors
          let nBigInt = bigInt(req.params.fib);
          if (nBigInt.lt(bigInt.zero)) {
            throw 'Input must be >= 0';
          } else if (nBigInt.gt(LIMIT)) {
            throw `Sorry! Can't generate higher than ${LIMIT.toString()} unless you raise the limit (see code)`;
          }
          return nBigInt.toString();
        })
        .catch(errString => {
          // Rethrow for higher handler
          let e = new Error(errString);
          e.status = 400;
          throw e;
        });
    })
    .then(nStr => workers(nStr))
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

module.exports = router;
