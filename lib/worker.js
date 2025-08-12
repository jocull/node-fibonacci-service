const { parentPort } = require('worker_threads');

const { getFibonacci } = require('./fib');

async function listener(msg) {
    console.log('Worker:', typeof msg, msg);
    if (msg === 'shutdown') {
        parentPort.off('message', listener);
        return;
    }

    try {
        if (msg?.op === 'fib') {
            const fib = await getFibonacci(msg.n);
            parentPort.postMessage({
                ...msg,
                result: fib,
            });
            return;
        }
    } catch (err) {
        console.error('Worker: Input:', msg, 'Caught:', err);
        parentPort.postMessage({
            ...msg,
            error: err,
        });
        return;
    }

    console.warn('Worker: Received weird job?', msg);
};
parentPort.on('message', listener);
