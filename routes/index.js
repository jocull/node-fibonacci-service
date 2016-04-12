var express = require('express');
var router = express.Router();

var workerFarm = require('worker-farm');
var workers = workerFarm(require.resolve('../fib'));

/* GET home page. */

router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
});

router.get('/fib/:fib', function(req, res) {
    var fibN = parseInt(req.params.fib);
    if (fibN == NaN) {
        res.send(400, "Bad fib value! " + fibN);
    } else {
        new Promise(function (resolve, reject) {
            workers(fibN, function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        }).then(function(result) {
            res.send(200, result);
        }).catch(function(err) {
            res.send(500, err);
        });
    }
});

module.exports = router;
