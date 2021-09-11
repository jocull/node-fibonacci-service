# Fibonacci number REST API

## What is this?

A REST API that generates arbitrarily large fibonacci numbers.

## Why would I even...?

Why do math when you can make HTTP requests?

## Implementation details

Calculation results are cached on the server for speed and results are arbitrarily large, at least until you run out of server memory. Results are sparsely cached to save memory, using "checkpoints" to save a bulk of effort before working forward from the checkpoint. This saves a lot of memory vs earlier versions that cached every result, but is slower in the higher ranges of numbers when calculation effort per number becomes very high.

Work is designed to be as cooperative as possible so that cache can respond even when the CPU is generally tied up doing work. It kinda works. Kinda.

Results are returned as strings and not JS numbers so they can be larger than the maximum JS integer. See the native primitive [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) for details.

One observation (as of Node v12.16.1) is that calculations with BigInt are very fast, but as the numbers grow the time and CPU required to perform `.toString()` on them becomes very large. Numbers can be retrieved from cache almost instantly, but the runtime will spend many seconds converting the results into strings that can be returned to the caller via JSON. Keep in mind that by the 2 millionth Fibonacci number, the resulting number string is over 400KB of data. Also keep in mind that while tied up in `.toString()` the execution thread is dominated and cannot be shared with any other processing. All cooperative efforts are lost.

## Installation + startup

Requires Node v10.4+.

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