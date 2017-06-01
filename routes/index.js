var express = require('express');
var router = express.Router();

var workerFarm = require('worker-farm');
var workers = workerFarm({ maxConcurrentWorkers: 1, autoStart: true }, require.resolve('../fib'));

/* GET home page. */

router.get('/', function (req, res) {
    res.render('index', { title: 'Express' });
});

router.get('/fib/:fib', function (req, res) {
    var fibN = parseInt(req.params.fib);
    if (fibN == NaN || fibN < 0) {
        res.send(400, "Bad fib value! " + fibN);
    } else {
        new Promise(function (resolve, reject) {
            workers(fibN, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        }).then(function (result) {
            res.status(200)
                .send({
                    result
                });
        }).catch(function (err) {
            res.status(500).send({
                message: err.message,
                stack: err.stack
            });
        });
    }
});

module.exports = router;
