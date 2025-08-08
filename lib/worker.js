const { parentPort } = require('worker_threads');
function listener(msg) {
    console.log('Worker:', typeof msg, msg);
    parentPort.postMessage('bye');
    if (msg === 'bye') {
        console.log('Worker: exiting...');
        parentPort.off('message', listener);
        setTimeout(() => console.log('bing'), 1000);
    }
};
parentPort.on('message', listener);