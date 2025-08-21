const { parentPort } = require('worker_threads');

const { getFibonacci } = require('./fib');

async function listener(msg) {
    // console.log('Worker:', typeof msg, msg);
    if (msg === 'shutdown') {
        parentPort.off('message', listener);
        return;
    }

    try {
        if (msg?.op === 'fib') {
            const fib = await getFibonacci(msg.n);

            let result;
            switch (msg?.format) {
                case 'base2':
                    result = fib.toString(2);
                    break;
                case 'base10':
                    result = fib.toString(10);
                    break;
                case 'base16':
                    result = fib.toString(16);
                    break;
                case 'bigint':
                default:
                    result = fib;
                    break;
            }

            parentPort.postMessage({
                ...msg,
                result: result,
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
