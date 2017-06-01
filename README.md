# Fibonacci number REST API

## What is this?

A REST API that generates arbitrarily large fibonacci numbers.

## Why would I even...?

Why do math when you can make HTTP requests?

## Implementation details

Calculation results are cached on the server for speed and results are arbitrarily large, at least until you run out of server memory or hit the hard limit. Work is offloaded to a child process, but it ends up blocking the main thread anyways because it's waiting on the cache to respond. That was dumb. I might fix it, but I probably won't fix it.

- See `const LIMIT` under `routes/index.js`) for the hard limit.
- See `package.json` and alter `--max_old_space_size=[____MB]` to raise (or lower) the memory limit for Node to fit your server.

Results are returned as strings and not JS numbers so they can be larger than the maximum JS integer. See [BigInteger.js](https://github.com/peterolson/BigInteger.js) for implementation details.

## Installation + startup

Requires Node v4+.

```
> git clone [mine] [yours]
> npm install
> npm start
```

## Usage

### Query Form

```
GET http[s]://{your_host}/fib/:integer
```

### Example request + response

```
GET http[s]://{your_host}/fib/500

 -- response --
200 OK
Content-Type:  application/json; charset=utf-8
Content-Length:  118
...

{"result":"139423224561697880139724382870407283950070256587697307264108962948325571622863290691557658876222521294125"}
```
