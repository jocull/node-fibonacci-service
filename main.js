const os = require('os');
const { Worker } = require('worker_threads');

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
        100_000_000,
        100_000,
        1_000_000,
        200_000_000,
        1000,
    ];
    const promises = workload.map(thisN => {
        const id = ++msgId
        return new Promise(resolve => {
            const w = worker();
            w.postMessage({
                id: id,
                op: 'fib',
                n: thisN,
            });
            // TODO: Bad, will always keep function attached!
            w.on('message', msg => {
                if (msg.id == id) {
                    resolve(msg);
                }
            });
        });
    });
    await Promise.all(promises);
    workers.forEach(w => w.postMessage('bye'));
})();
