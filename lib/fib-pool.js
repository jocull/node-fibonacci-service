const os = require('os');
const { Worker } = require('worker_threads');

const WAITING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const waiting = {};
const workers = new Array(os.cpus().length).fill(0)
    .map(() => new Worker('./lib/worker.js'))
    .map(worker => {
        worker.on('error', (err) => console.error(err));
        worker.on('exit', (code) => console.warn('Worker exited with code:', code));
        worker.on('message', (msg) => {
            // console.log('Main:', typeof msg, msg);
            console.log('Pool: Ready:', msg?.id);
            const promise = waiting[msg?.id];
            if (promise) {
                promise.resolve(msg);
            } else {
                console.warn('Received message', msg?.id, 'did not match a waiting promise?', msg);
            }
        });
        return worker;
    });

const getWorkerRoundRobin = (() => {
    let workerIdx = 0;
    return () => {
        const w = workers[workerIdx];
        workerIdx++;
        if (workerIdx > workers.length - 1) {
            workerIdx = 0;
        }
        return w;
    };
})();

const getNextMessageId = (() => {
    let msgId = 0;
    return () => ++msgId;
})();

function promiseMessage(msg) {
    const w = getWorkerRoundRobin();
    const id = getNextMessageId();
    let timeout;
    const promise = new Promise((resolve, reject) => {
        // Register into waiting
        waiting[id] = {
            resolve,
            reject,
        };

        timeout = setTimeout(() => {
            reject(new Error(`Timed out: ${id}`));
        }, WAITING_TIMEOUT_MS);

        w.postMessage({
            id: id,
            ...msg,
        });
    });

    // Always:
    // - cancel and pending timers (to avoid hanging process)
    // - remove this promise from waiting
    promise
        // Do nothing for errors in this promise branch - just prevent uncaught errors.
        // The promise chain above (and returned) will propagate errors instead.
        .catch((err) => { })
        .finally(() => {
            clearTimeout(timeout);
            delete waiting[id];
        });

    return {
        id,
        promise,
    };
}

async function getFibonacci(n) {
    const posted = promiseMessage({
        op: 'fib',
        n: n,
    });
    const msg = await posted.promise;
    if (msg.error != null) {
        throw msg.error;
    }
    if (msg.result != null) {
        return msg.result;
    }
    console.warn('Pool: Received weird response?', msg);
    throw new Error('Response not understood');
}

function shutdown() {
    // Needs to be a raw message sent this way.
    // Can't be unpacked into an object with id because it's a raw string.
    workers.forEach(w => w.postMessage('shutdown'));
}

module.exports = {
    getFibonacci,
    shutdown,
};
