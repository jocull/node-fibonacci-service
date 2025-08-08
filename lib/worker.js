const { parentPort } = require('worker_threads');
function listener(msg) {
    console.log('Worker:', typeof msg, msg);
    if (msg === 'bye') {
        console.log('Worker: exiting...');
        parentPort.postMessage('bye');
        parentPort.off('message', listener);
        setTimeout(() => console.log('bing'), 1000);
    }
};
parentPort.on('message', listener);