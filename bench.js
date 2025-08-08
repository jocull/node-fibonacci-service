// Iterative Fibonacci with BigInt
function fibonacciBigInt(n) {
    if (n === 0) return BigInt(0);
    let a = BigInt(0), b = BigInt(1);
    for (let i = 1; i < n; i++) {  // Start from i = 1 and iterate up to n-1
        [a, b] = [b, a + b];
    }
    return b;
}

// Iterative Fast-Doubling Fibonacci with BigInt
function fibonacciIterativeFastDoubling(n) {
    if (n === 0) return 0n;

    let a = 1n, b = 1n; // F(1) = 1, F(2) = 1
    const binary = n.toString(2);
    for (let i = 1; i < binary.length; i++) {
        const bit = binary[i];
        const c = a * (2n * b - a);
        const d = a * a + b * b;

        if (bit === '1') {
            a = d;
            b = c + d;
        } else {
            a = c;
            b = d;
        }
    }

    return a;
}

function timed(title, fnTimed) {
    console.log(new Date(), title, 'starts');
    const start = Date.now();
    const retVal = fnTimed();
    const end = Date.now();
    console.log(new Date(), title, 'ends', (end - start), 'ms');
    return retVal;
}

(function () {
    // const TARGET_WARMUP = 1_000_000;
    // const f1 = timed('Warm-up fibonacciBigInt', () => {
    //     return fibonacciBigInt(TARGET_WARMUP);
    // });

    // const f2 = timed('Warm-up fibonacciIterativeFastDoubling', () => {
    //     return fibonacciIterativeFastDoubling(TARGET_WARMUP);
    // });

    // if (f1 !== f2) {
    //     console.error('Mismatch!', f1, f2);
    //     throw new Error('Mismatch!');
    // }

    const TARGET_BENCH = 100_000_000;
    // const f3 = timed('Benchmark fibonacciBigInt', () => {
    //     return fibonacciBigInt(TARGET_BENCH);
    // });

    // @type {bigint}
    const f4 = timed('Benchmark fibonacciIterativeFastDoubling', () => {
        return fibonacciIterativeFastDoubling(TARGET_BENCH);
    });

    // if (f3 !== f4) {
    //     console.error('Mismatch!', f1, f2);
    //     throw new Error('Mismatch!');
    // }

    let f4s;
    timed('Stringify fn', () => {
        f4s = f4.toString(16);
        return f4.length;
    });

    timed('Parse fn', () => {
        return BigInt(`0x${f4s}`);
    });
})();
