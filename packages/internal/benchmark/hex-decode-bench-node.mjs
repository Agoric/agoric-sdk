/* eslint-disable no-bitwise */
/**
 * Node.js (V8, JIT) runner for the hex-decode benchmark.
 *
 * Loads the engine-agnostic core (the Map accelerator decode and the Endo
 * arithmetic decode), asserts both decode identically across lower/UPPER/mixed
 * case, then times each approach across several input sizes with warmup and
 * auto-calibrated iteration counts. Also measures two Node-only data points:
 * the Node `Buffer.from(hex,'hex')` path that the internal codec actually uses
 * when `Buffer` is present, and the native `Uint8Array.fromHex` intrinsic that
 * @endo/hex prefers when the platform ships it.
 *
 * Run: node packages/internal/benchmark/hex-decode-bench-node.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const coreSrc = readFileSync(`${here}hex-decode-bench-core.js`, 'utf8');
// Evaluate the core in this realm; it installs globalThis.hexbench.
// eslint-disable-next-line no-eval
(0, eval)(coreSrc);
const { hexbench } = globalThis;

const SIZES = [
  { name: 'short', bytes: 8 },
  { name: 'medium', bytes: 1024 },
  { name: 'large', bytes: 16384 },
];
const MODES = ['lower', 'upper', 'mixed'];
const SEED = 0x1234abcd;

// Build the corpus and check correctness BEFORE any timing.
for (const { name, bytes } of SIZES) {
  for (const mode of MODES) {
    const key = `${name}-${mode}`;
    hexbench.makeCorpus(key, bytes, mode, SEED);
    hexbench.checkCorrectness(key, bytes, SEED);
  }
}

// --- Node-only decoders, timed with the same harness -------------------------

const bufferDecodeHex = hex => {
  if (hex.length % 2 !== 0) throw new Error('odd length');
  const b = Buffer.from(hex, 'hex');
  if (b.byteLength !== hex.length / 2) throw new Error('invalid hex');
  return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
};
const nativeFromHex =
  typeof (/** @type {any} */ (Uint8Array).fromHex) === 'function'
    ? hex => Uint8Array.fromHex(hex)
    : undefined;

// Corpus mirror in this realm for the Node-only loops (the core keeps its own
// private copy; we rebuild identical strings here).
const localCorpus = Object.create(null);
{
  const makeBytes = (n, seed) => {
    const out = new Uint8Array(n);
    let s = seed >>> 0;
    for (let i = 0; i < n; i += 1) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      out[i] = (s >>> 16) & 0xff;
    }
    return out;
  };
  const enc = [];
  for (let b = 0; b < 256; b += 1) enc.push(b.toString(16).padStart(2, '0'));
  const caseVariant = (s, mode) => {
    if (mode === 'lower') return s;
    if (mode === 'upper') return s.toUpperCase();
    let out = '';
    for (let i = 0; i < s.length; i += 1)
      out += i % 2 === 0 ? s[i].toUpperCase() : s[i];
    return out;
  };
  for (const { name, bytes } of SIZES) {
    for (const mode of MODES) {
      const by = makeBytes(bytes, SEED);
      let hex = '';
      for (let i = 0; i < by.length; i += 1) hex += enc[by[i]];
      localCorpus[`${name}-${mode}`] = caseVariant(hex, mode);
    }
  }
}

const localLoop = (fn, key, iters) => {
  const hex = localCorpus[key];
  let sink = 0;
  for (let k = 0; k < iters; k += 1) {
    const out = fn(hex);
    sink = (sink + out[0] + out[out.length - 1]) & 0xffff;
  }
  return sink;
};

// --- Timing harness ----------------------------------------------------------

const now = () => Number(process.hrtime.bigint());
const TARGET_NS = 350e6; // grow iterations until a measured run exceeds this

// Auto-calibrate iters so the timed region runs ~TARGET_NS, then take the best
// (minimum ns/op) of several measured reps to reject scheduler noise.
const timeOp = run => {
  // Warmup + calibrate.
  let iters = 64;
  for (;;) {
    const t0 = now();
    run(iters);
    const dt = now() - t0;
    if (dt >= TARGET_NS || iters >= 1 << 30) break;
    const scale = Math.max(2, Math.min(16, TARGET_NS / Math.max(dt, 1)));
    iters = Math.ceil(iters * scale);
  }
  // A couple more warmup passes at the chosen size.
  run(iters);
  run(iters);
  let best = Infinity;
  for (let rep = 0; rep < 5; rep += 1) {
    const t0 = now();
    run(iters);
    const dt = now() - t0;
    best = Math.min(best, dt / iters);
  }
  return { nsPerOp: best, iters };
};

const APPROACHES = [
  {
    key: 'map',
    label: 'Map accelerator (internal)',
    run: (key, n) => hexbench.decodeLoop('map', key, n),
  },
  {
    key: 'arith',
    label: 'Arithmetic (@endo/hex jsDecodeHex)',
    run: (key, n) => hexbench.decodeLoop('arith', key, n),
  },
  {
    key: 'lut',
    label: 'charCode Uint8Array LUT',
    run: (key, n) => hexbench.decodeLoop('lut', key, n),
  },
  {
    key: 'buffer',
    label: 'Buffer.from (internal on Node)',
    run: (key, n) => localLoop(bufferDecodeHex, key, n),
  },
];
if (nativeFromHex) {
  APPROACHES.push({
    key: 'native',
    label: 'Uint8Array.fromHex (native)',
    run: (key, n) => localLoop(nativeFromHex, key, n),
  });
}

// One-time table build cost (the accelerator's fixed overhead).
const buildReps = 200;
{
  // Warmup
  for (let i = 0; i < 20; i += 1) (0, eval)(coreSrc);
  let best = Infinity;
  for (let rep = 0; rep < 5; rep += 1) {
    const t0 = now();
    for (let i = 0; i < buildReps; i += 1) (0, eval)(coreSrc);
    best = Math.min(best, (now() - t0) / buildReps);
  }
  // Restore the canonical hexbench after the rebuild loop.
  (0, eval)(coreSrc);
  for (const { name, bytes } of SIZES) {
    for (const mode of MODES)
      globalThis.hexbench.makeCorpus(`${name}-${mode}`, bytes, mode, SEED);
  }
  // eslint-disable-next-line no-console
  console.log(
    `\n# Table build cost (Map accelerator, ${globalThis.hexbench.tableSize}-entry Map)`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  core-eval incl. 484-entry table build: ~${(best / 1000).toFixed(1)} us per realm init\n`,
  );
}

// --- Run ---------------------------------------------------------------------

const results = [];
for (const { name, bytes } of SIZES) {
  for (const mode of MODES) {
    const key = `${name}-${mode}`;
    for (const a of APPROACHES) {
      const { nsPerOp, iters } = timeOp(n => a.run(key, n));
      const nsPerByte = nsPerOp / bytes;
      const mbPerSec = 1e3 / nsPerByte; // bytes/ns -> MB/s
      results.push({
        size: name,
        bytes,
        mode,
        approach: a.key,
        nsPerOp,
        nsPerByte,
        mbPerSec,
        iters,
      });
    }
  }
}

// --- Report ------------------------------------------------------------------

const fmt = (n, w) => String(n).padStart(w);
const pad = (s, w) => String(s).padEnd(w);
// eslint-disable-next-line no-console
console.log(
  '# Node.js hex decode (ns/op, lower is better; MB/s, higher is better)\n',
);
// eslint-disable-next-line no-console
console.log(`node ${process.version}, V8 ${process.versions.v8}\n`);
let header = `${pad('size', 8)}${pad('mode', 7)}`;
for (const a of APPROACHES) header += pad(a.key, 12);
// eslint-disable-next-line no-console
console.log(header);
for (const { name } of SIZES) {
  for (const mode of MODES) {
    let row = `${pad(name, 8)}${pad(mode, 7)}`;
    for (const a of APPROACHES) {
      const r = results.find(
        x => x.size === name && x.mode === mode && x.approach === a.key,
      );
      row += pad(`${r.nsPerOp.toFixed(0)}`, 12);
    }
    // eslint-disable-next-line no-console
    console.log(row);
  }
}
// eslint-disable-next-line no-console
console.log('\n# Throughput MB/s\n');
// eslint-disable-next-line no-console
console.log(header);
for (const { name } of SIZES) {
  for (const mode of MODES) {
    let row = `${pad(name, 8)}${pad(mode, 7)}`;
    for (const a of APPROACHES) {
      const r = results.find(
        x => x.size === name && x.mode === mode && x.approach === a.key,
      );
      row += pad(`${r.mbPerSec.toFixed(1)}`, 12);
    }
    // eslint-disable-next-line no-console
    console.log(row);
  }
}

// Machine-readable for the report.
// eslint-disable-next-line no-console
console.log(
  `\n#JSON ${JSON.stringify({ engine: 'node', version: process.version, tableSize: globalThis.hexbench.tableSize, results })}`,
);
void fmt;
