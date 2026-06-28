# hex decode benchmark: Map accelerator vs arithmetic

This benchmark empirically tests whether the 484-entry `Map` "accelerator" that
`packages/internal/src/hex.js` builds for `makePortableHexCodec().decodeHex` is
actually faster than a table-free arithmetic decode, on **Node.js (V8, JIT)**
and on **XS (xsnap, interpreted and metered)**. On the consensus engine the
metered compute cost, not wall-clock, is what a contract pays, so the XS runner
reports both.

## The approaches

- **`map`** — the Agoric-internal accelerator. A `Map` keyed by the 2-char hex
  string, with all four lower/UPPER permutations of every byte pre-inserted
  (484 distinct keys). Decode does `hex.slice(i, i+2)` then `decodings.get(...)`
  per byte. Mirrors `makePortableHexCodec` at commit `47b701c`.
- **`arith`** — `@endo/hex`'s `jsDecodeHex`: pure `charCodeAt` nibble arithmetic
  in a bounded loop, no table.
- **`lut`** — a third design the report weighs: a 256-entry `charCode -> nibble`
  `Uint8Array` lookup table. No `Map`, no per-byte string slice, native
  typed-array indexing.
- **`buffer`** (Node only) — `Buffer.from(hex, 'hex')`, the path the internal
  codec actually takes when `Buffer` is present (`makeBufferishHexCodec`).
- **`native`** (Node only, when present) — the TC39 `Uint8Array.fromHex`
  intrinsic `@endo/hex`'s `decodeHex` prefers. Absent on Node 22.23.

## Files

- `hex-decode-bench-core.js` — engine-agnostic core: both decoders, a
  deterministic LCG corpus builder, a correctness check, and the timed loop. No
  imports; the identical source runs on Node and XS. **No `flatMap` anywhere**:
  every table and corpus is built with a bounded `for` loop, since `flatMap`
  table construction is the XS metered-stack hazard PR #7 fixed.
- `hex-decode-bench-node.mjs` — Node runner. Auto-calibrates iterations, warms
  up, and reports ns/op and MB/s.
- `hex-decode-bench-xs.mjs` — XS runner. Drives a prebuilt `xsnap-worker` over
  its netstring protocol and reports both wall-clock per decode and metered
  `compute` per decode (an `empty` baseline loop is subtracted out).

## Running

```sh
node packages/internal/benchmark/hex-decode-bench-node.mjs

# XS needs an exec-capable xsnap-worker (many sandboxes mount /tmp noexec, so
# copy the cached prebuilt to an exec path first):
XSNAP_WORKER=/path/to/xsnap-worker \
  node packages/internal/benchmark/hex-decode-bench-xs.mjs
```

Both runners assert that `map`, `arith`, and `lut` decode byte-for-byte
identically (including mixed case) before any timing.

## Methodology

- Inputs are deterministic (a seeded LCG), identical across approaches and
  engines, at three sizes (8 B, 1 KiB, 16 KiB) and three case modes (lower,
  UPPER, mixed) so the `Map`'s four-permutation reason-for-existing is actually
  exercised.
- The corpus and the `Map` are built **outside** the timed loop; the one-time
  table build cost is reported separately (wall on Node, metered compute on XS).
- Only the decode call is timed. A checksum of each result is accumulated so
  neither engine can eliminate the loop as dead code.
