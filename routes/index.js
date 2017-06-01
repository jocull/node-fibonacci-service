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
                  require.resolve('../fib')));

class ValidationError extends Error {}

router.get('/', function (req, res) {
  res.status(200)
    .send({
      status: 'ok!',
    });
});

router.get('/fib/:fib', function (req, res) {
  return Promise.resolve()
    .then(() => {
      return Promise.try(() => {
          // bigInt throws strings on parsing failure
          let nBigInt = bigInt(req.params.fib);
          if (nBigInt.lt(bigInt.zero)) {
            throw 'Input must be >= 0';
          }
          return nBigInt.toString();
        })
        .catch(errString => {
          // Rethrow for higher handler
          throw new ValidationError(errString);
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
      console.error('err2', err, typeof err);
      if (err instanceof ValidationError) {
        res.status(400)
          .send({
            error: err.message,
          });
      } else {
        res.status(500)
          .send({
            error: err.message,
            stack: err.stack,
          });
      }
    });
});

module.exports = router;
