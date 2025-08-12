const fp = require('./lib/fib-pool');

(async function main() {
    console.log('Main: begin...');
    const workload = [
        1_000_000_000,
        -1,
        200_000_000,
        100_000_000,
        100_000,
        1_000_000,
        1_600_000_000,
        200_000_000,
        1000,
        200_000_000,
        100_000_000,
        200_000_000,
        1_000_000_000,
        500_000_000,
        900_000_000,
    ];
    const promises = workload.map(async (thisN, idx) => {
        try {
            console.log('Main: Waiting...', idx);
            const result = await fp.getFib(thisN);
            console.log('Main: Result:', idx, typeof result);
        } catch (err) {
            return console.error('Main: Error:', idx, typeof err, err instanceof Error, err);
        }
    });
    await Promise.all(promises);
    console.log('Main: Done!');
    fp.shutdown();
})();
