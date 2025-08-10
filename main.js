const { Worker } = require('worker_threads');

const worker = new Worker('./lib/worker.js');
worker.on('error', (err) => console.error(err));
worker.on('exit', (code) => console.warn('Worker exited with code', code));

(async function main() {
    console.log('Main: begin...');
    worker.on('message', msg => {
        // console.log('Main:', typeof msg, msg);
        console.log('Main:', typeof msg,
            msg?.op, msg?.n, typeof msg?.result,
            msg?.result.toString(16).length);

        // Right now, always exit after no matter what.
        worker.postMessage('bye');
    });
    worker.postMessage({
        op: 'fib',
        n: 100_000_000,
    });
    worker.postMessage({
        op: 'fib',
        n: 100_000,
    });
    worker.postMessage({
        op: 'fib',
        n: 1_000_000,
    });
    worker.postMessage({
        op: 'fib',
        n: 200_000_000,
    });
    worker.postMessage({
        op: 'fib',
        n: 1000,
    });
})();
