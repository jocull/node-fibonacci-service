# Fibonacci number REST API

## What is this?

A REST API that generates arbitrarily large Fibonacci numbers.

## Why would I even...?

Why do math when you can make HTTP requests?

## Implementation details

Uses a [fast doubling method](https://www.nayuki.io/page/fast-fibonacci-algorithms) to calculate huge Fibonacci numbers very fast.

The previous implementation was very naive compared to this. It is **worlds apart** in terms of speed. Calculating a deep millionth Fibonacci with an iterative version takes a substantial amount of time. Calculation a billionth is impractical, if not unfeasible. The fast doubling do these in a manageable number of seconds.

---

Offloads calculations to a worker thread pool to avoid blocking the main thread as much.
It sorta works...

With big numbers everything just gets huge. It's hard to make it all work fairly when copying huge strings or doing deep calculations.
Work is designed to be as cooperative as possible so that threads can respond even when the CPU is generally tied up doing work. It kinda works. Kinda.

---

Results are returned as strings and not JS numbers so they can be larger than the maximum JS integer. See the native primitive [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) for details.

## Observations

These observations were made with Node v24.3.0

Calculations with the native primitive `BigInt` are very fast, but as the numbers grow the time and CPU required to perform `.toString()` (a base 10 string) on them becomes very large. Numbers can be retrieved from calculated very fast, sometimes almost instantly, but the runtime will spend many seconds converting the results into strings that can be returned to the caller via JSON.

Keep in mind that by the 2 millionth Fibonacci number, the resulting number string is over 400KB of data. Also keep in mind that while tied up in `.toString()` the execution thread is dominated and cannot be shared with any other processing. Most or all cooperative efforts are lost on that thread, seemingly also impacting basic message sending and IPC.

The billionth Fibonacci number is well over 50MB of text :)

## Installation + startup

Requires Node version >= 12 to support threading

```
> git clone [mine] [yours]
> npm install
> npm start
```

## Usage

### Query Form

```
One:  GET http[s]://{your_host}/fib/:integer
Many: GET http[s]://{your_host}/fib/:integer/:integer/:integer/...
```

### Example request + response (one)

```
GET http[s]://{your_host}/fib/500

 -- response --
200 OK
Content-Type:  application/json; charset=utf-8
Content-Length:  118
...

{
  "result": "139423224561697880139724382870407283950070256587697307264108962948325571622863290691557658876222521294125"
}
```

### Example request + response (many)

```
GET http[s]://{your_host}/fib/5/100/500

 -- response --
200 OK
Content-Type:  application/json; charset=utf-8
Content-Length:  164

{
  "result": {
    "5": "5",
    "100": "354224848179261915075",
    "500": "139423224561697880139724382870407283950070256587697307264108962948325571622863290691557658876222521294125"
  }
}
```