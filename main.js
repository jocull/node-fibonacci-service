const os = require('os');
const { Worker } = require('worker_threads');

const waiting = {};
const workers = new Array(os.cpus().length).fill(0)
    .map(() => new Worker('./lib/worker.js'))
    .map(worker => {
        worker.on('error', (err) => console.error(err));
        worker.on('exit', (code) => console.warn('Worker exited with code', code));
        worker.on('message', msg => {
            // console.log('Main:', typeof msg, msg);
            console.log('Main:', typeof msg,
                msg?.id,
                msg?.op, msg?.n, typeof msg?.result,
                msg?.result.toString(16).length);

            const promise = waiting[msg?.id];
            if (promise) {
                promise.resolve(msg);
            } else {
                console.warn('Received message', msg?.id, 'did not match a waiting promise?');
            }
        });
        return worker;
    });

let workerIdx = 0;
function worker() {
    const w = workers[workerIdx];
    workerIdx++;
    if (workerIdx > workers.length - 1) {
        workerIdx = 0;
    }
    return w;
}

(async function main() {
    let msgId = 0;
    console.log('Main: begin...');
    const workload = [
        200_000_000,
        100_000_000,
        100_000,
        1_000_000,
        200_000_000,
        1000,
        200_000_000,
        100_000_000,
        200_000_000,
        1_000_000_000,
        500_000_000,
        900_000_000,
    ];
    const promises = workload.map(thisN => {
        const id = ++msgId;
        let timeout;
        const promise = new Promise((resolve, reject) => {
            // Register into waiting
            waiting[id] = {
                resolve,
                reject,
            };

            timeout = setTimeout(() => {
                reject(new Error(`Timed out: ${thisN} (${id})`));
            }, 60_000);

            const w = worker();
            w.postMessage({
                id: id,
                op: 'fib',
                n: thisN,
            });
        });

        // Always:
        // - cancel and pending timers (to avoid hanging process)
        // - remove this promise from waiting
        promise
            .catch((err) => { }) // do nothing, just prevent uncaught here
            .finally(() => {
                clearTimeout(timeout);
                delete waiting[id];
            });

        return promise;
    });
    for (const promise of promises) {
        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    }
    while (workers.length > 0) {
        const w = workers.pop();
        w.unref();
    }
})();
