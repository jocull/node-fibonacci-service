const { parentPort } = require('worker_threads');

const { getFibonacci } = require('./fib');

async function listener(msg) {
    console.log('Worker:', typeof msg, msg);
    if (msg === 'bye') {
        console.log('Worker: exiting...');
        parentPort.off('message', listener);
        return;
    }

    if (msg?.op === 'fib') {
        const fib = await getFibonacci(msg.n);
        parentPort.postMessage({
            ...msg,
            result: fib,
        });
        return;
    }
};
parentPort.on('message', listener);
