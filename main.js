const { Worker } = require('worker_threads');

const worker = new Worker('./lib/worker.js');
worker.on('message', msg => {
    console.log('Main:', typeof msg, msg);
    if (msg === 'bye') {
        worker.postMessage('bye');
        // worker.unref();
        // setTimeout(() => console.log('ding'), 5000);
    }
});
worker.postMessage('hey');
worker.postMessage(105n);