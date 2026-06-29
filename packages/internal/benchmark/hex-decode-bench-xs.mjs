/* eslint-disable no-bitwise */
/**
 * XS (xsnap) runner for the hex-decode benchmark.
 *
 * Drives a prebuilt agoric `xsnap-worker` over its fd-3/fd-4 netstring
 * protocol (the same protocol @agoric/xsnap speaks), feeds it the identical
 * engine-agnostic core used by the Node runner, then for each approach and
 * input reports BOTH the XS wall-clock per decode AND the XS metered `compute`
 * per decode. On the consensus engine the metered cost, not wall-clock, is what
 * a contract pays, so it is the number that decides whether the 484-entry Map
 * accelerator earns its keep.
 *
 * The worker path defaults to the cached agoric prebuilt; override with
 * XSNAP_WORKER. NOTE: many sandboxes mount /tmp noexec, so copy the worker to
 * an exec-capable path (for example under ~/.cache) before pointing this here.
 *
 * Run: XSNAP_WORKER=/path/to/xsnap-worker \
 *        node packages/internal/benchmark/hex-decode-bench-xs.mjs
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKER =
  process.env.XSNAP_WORKER ||
  '/home/kris/.cache/agoric-sdk/xsnap/prebuilt/0.14.2/bundle/dist/linux-x64/release/xsnap-worker';

const here = fileURLToPath(new URL('.', import.meta.url));
const coreSrc = readFileSync(`${here}hex-decode-bench-core.js`, 'utf8');

const enc = new TextEncoder();
const dec = new TextDecoder();
const OK = '.'.charCodeAt(0);
const ERROR = '!'.charCodeAt(0);
const OK_SEPARATOR = 1;

const frame = bytes => {
  const head = enc.encode(`${bytes.length}:`);
  const out = new Uint8Array(head.length + bytes.length + 1);
  out.set(head, 0);
  out.set(bytes, head.length);
  out[out.length - 1] = ','.charCodeAt(0);
  return out;
};

const makeReader = onMessage => {
  let buf = Buffer.alloc(0);
  return chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const colon = buf.indexOf(0x3a);
      if (colon < 0) return;
      const len = Number(buf.subarray(0, colon).toString('ascii'));
      const start = colon + 1;
      const end = start + len;
      if (buf.length < end + 1) return;
      const payload = buf.subarray(start, end);
      buf = buf.subarray(end + 1);
      onMessage(Uint8Array.from(payload));
    }
  };
};

const makeWorker = ({ meteringLimit }) => {
  const args = ['hexbench'];
  if (meteringLimit) args.push('-l', `${meteringLimit}`);
  const child = spawn(WORKER, args, {
    stdio: [
      'ignore',
      'inherit',
      'inherit',
      'pipe',
      'pipe',
      'ignore',
      'ignore',
      'ignore',
      'ignore',
    ],
  });
  let pending = null;
  const reader = makeReader(msg => {
    if (!pending) return;
    const p = pending;
    pending = null;
    if (msg[0] === OK) {
      const sep = msg.indexOf(OK_SEPARATOR, 1);
      let meter = null;
      if (sep > 1) {
        try {
          meter = JSON.parse(dec.decode(msg.subarray(1, sep)));
        } catch {
          meter = null;
        }
      }
      const reply = sep < 0 ? msg.subarray(1) : msg.subarray(sep + 1);
      p.resolve({ ok: true, meter, reply: dec.decode(reply) });
    } else if (msg[0] === ERROR) {
      p.resolve({ ok: false, error: dec.decode(msg.subarray(1)) });
    } else {
      p.resolve({ ok: false, error: `unknown reply ${dec.decode(msg)}` });
    }
  });
  child.stdio[4].on('data', reader);
  const toX = child.stdio[3];
  const evaluate = code =>
    new Promise(resolve => {
      pending = { resolve };
      toX.write(Buffer.from(frame(enc.encode(`e${code}`))));
    });
  const close = () => {
    try {
      child.kill();
    } catch {
      // ignore
    }
  };
  return { evaluate, close };
};

const must = res => {
  if (!res.ok) throw new Error(`XS eval failed: ${res.error}`);
  return res;
};

const SIZES = [
  { name: 'short', bytes: 8, iters: 4000 },
  { name: 'medium', bytes: 1024, iters: 400 },
  { name: 'large', bytes: 16384, iters: 40 },
];
const MODES = ['lower', 'upper', 'mixed'];
const SEED = 0x1234abcd;

const w = makeWorker({ meteringLimit: 2_000_000_000 });

// Table build cost: the metered compute of evaluating the core (which builds
// the 484-entry Map accelerator at module scope).
const buildRes = must(await w.evaluate(coreSrc));
const tableBuildCompute = buildRes.meter ? buildRes.meter.compute : null;
// xsnap's `e` reply carries the meter but not the completion value, so confirm
// the table size by asserting inside XS (throws -> non-ok if it is not 484).
must(
  await w.evaluate(
    'if (hexbench.tableSize !== 484) throw Error("table size " + hexbench.tableSize)',
  ),
);
const tableSize = 484;

// Build + correctness-check every corpus before timing. checkCorrectness
// throws inside XS on any mismatch, so an ok reply IS the pass signal.
for (const { name, bytes } of SIZES) {
  for (const mode of MODES) {
    const key = `${name}-${mode}`;
    must(
      await w.evaluate(
        `hexbench.makeCorpus(${JSON.stringify(key)}, ${bytes}, ${JSON.stringify(mode)}, ${SEED})`,
      ),
    );
    must(
      await w.evaluate(
        `hexbench.checkCorrectness(${JSON.stringify(key)}, ${bytes}, ${SEED})`,
      ),
    );
  }
}

// Measure one (approach,key) cell: median-ish wall over a few reps plus the
// deterministic metered compute, both for the requested approach and the
// 'empty' loop baseline so loop/call overhead is subtracted out.
const measure = async (approach, key, iters) => {
  const call = `hexbench.decodeLoop(${JSON.stringify(approach)}, ${JSON.stringify(key)}, ${iters})`;
  // warmup
  must(await w.evaluate(call));
  let bestWall = Infinity;
  let compute = null;
  for (let rep = 0; rep < 4; rep += 1) {
    const t0 = process.hrtime.bigint();
    const r = must(await w.evaluate(call));
    const dt = Number(process.hrtime.bigint() - t0);
    bestWall = Math.min(bestWall, dt);
    if (r.meter) compute = r.meter.compute;
  }
  return { wall: bestWall, compute };
};

const results = [];
for (const { name, bytes, iters } of SIZES) {
  for (const mode of MODES) {
    const key = `${name}-${mode}`;
    const base = await measure('empty', key, iters);
    for (const approach of ['map', 'arith', 'lut']) {
      const m = await measure(approach, key, iters);
      const wallPerOp = (m.wall - base.wall) / iters;
      const computePerOp =
        m.compute != null && base.compute != null
          ? (m.compute - base.compute) / iters
          : null;
      results.push({
        size: name,
        bytes,
        mode,
        approach,
        iters,
        wallPerOpNs: wallPerOp,
        computePerOp,
        computeTotal: m.compute,
      });
    }
  }
}

w.close();

// --- Report ------------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n);
const find = (size, mode, approach) =>
  results.find(
    r => r.size === size && r.mode === mode && r.approach === approach,
  );

// eslint-disable-next-line no-console
console.log(
  `# XS (xsnap) hex decode\nworker: ${WORKER}\ntable: ${tableSize}-entry Map\n`,
);
// eslint-disable-next-line no-console
console.log(`# Table build cost (one-time, at module instantiation)`);
// eslint-disable-next-line no-console
console.log(
  `  metered compute to build the 484-entry Map accelerator: ${tableBuildCompute}\n`,
);

const APPROACHES = ['map', 'arith', 'lut'];
const head = `${pad('size', 8)}${pad('mode', 7)}${APPROACHES.map(a => pad(a, 12)).join('')}${pad('map/arith', 10)}`;

// eslint-disable-next-line no-console
console.log('# XS metered compute per decode (lower is better)\n');
// eslint-disable-next-line no-console
console.log(head);
for (const { name } of SIZES) {
  for (const mode of MODES) {
    const cells = APPROACHES.map(a =>
      pad(find(name, mode, a).computePerOp.toFixed(0), 12),
    ).join('');
    const ratio =
      find(name, mode, 'map').computePerOp /
      find(name, mode, 'arith').computePerOp;
    // eslint-disable-next-line no-console
    console.log(
      `${pad(name, 8)}${pad(mode, 7)}${cells}${pad(`${ratio.toFixed(2)}x`, 10)}`,
    );
  }
}

// eslint-disable-next-line no-console
console.log('\n# XS wall-clock per decode, ns (lower is better)\n');
// eslint-disable-next-line no-console
console.log(head);
for (const { name } of SIZES) {
  for (const mode of MODES) {
    const cells = APPROACHES.map(a =>
      pad(find(name, mode, a).wallPerOpNs.toFixed(0), 12),
    ).join('');
    const ratio =
      find(name, mode, 'map').wallPerOpNs /
      find(name, mode, 'arith').wallPerOpNs;
    // eslint-disable-next-line no-console
    console.log(
      `${pad(name, 8)}${pad(mode, 7)}${cells}${pad(`${ratio.toFixed(2)}x`, 10)}`,
    );
  }
}

// eslint-disable-next-line no-console
console.log(
  `\n#JSON ${JSON.stringify({ engine: 'xs', worker: WORKER, tableSize, tableBuildCompute, results })}`,
);
