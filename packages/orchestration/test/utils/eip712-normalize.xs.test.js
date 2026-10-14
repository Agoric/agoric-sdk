// Runs `eip712-normalize.ts` inside a real XS engine (via `@agoric/xsnap`),
// not just Node/V8 -- this module is meant to run on-chain (see its own
// module doc comment), so its behavior under XS specifically is what
// matters. `eip712-normalize.test.ts` covers logic exhaustively but only
// ever runs under Node/V8, so it can't catch an XS-specific engine
// discrepancy such as https://github.com/Moddable-OpenSource/moddable/commit/
// eac811dcd989bc6ecd56f4eb125e4a9ffd1a8860 ("XS: Array.from fix"), not yet in
// the XS build this repo pins (see `packages/xsnap/test/xs-js.test.js`'s
// `test.failing('Array.from result enumerates every element', ...)`).
import '@endo/init/debug.js';

import test from 'ava';
import * as proc from 'node:child_process';
import fs from 'node:fs';
import * as os from 'node:os';
import { tmpName } from 'tmp';
import { xsnap } from '@agoric/xsnap';
import bundleSource from '@endo/bundle-source';

import url from 'node:url';

/**
 * @import {XSnapOptions} from '@agoric/xsnap/src/xsnap.js';
 * @import {NormalizeAndValidateEIP712DataInput, NormalizeAndValidateEIP712DataOptions} from '../../src/utils/viem-utils/eip712-normalize.ts';
 */

const here = url.fileURLToPath(new URL('.', import.meta.url));
const sourcePath = `${here}../../src/utils/viem-utils/eip712-normalize.ts`;
/** A source bundle of the real `eip712-normalize.ts` to evaluate in XS vats. */
const bundleP = bundleSource(sourcePath, { format: 'endoScript' });

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

/**
 * Evaluates `normalizeAndValidateEIP712Data(input, options)` inside a fresh
 * XS vat and reports whether it threw, and either the resulting `message` or
 * the thrown error's `message` string.
 *
 * @param {NormalizeAndValidateEIP712DataInput} input
 * @param {NormalizeAndValidateEIP712DataOptions} options
 */
const runInXs = async (input, options) => {
  const opts = xsnapTestOptions();
  const bundle = await bundleP;
  const vat = await xsnap(opts);
  try {
    await vat.evaluate(`
      let threw = false;
      let result;
      try {
        const exports = ${bundle.source};
        const { normalizeAndValidateEIP712Data } = exports;
        if (typeof normalizeAndValidateEIP712Data !== 'function') {
          throw Error('expected an export \`normalizeAndValidateEIP712Data\`');
        }
        result = normalizeAndValidateEIP712Data(
          ${JSON.stringify(input)},
          ${JSON.stringify(options)},
        );
      } catch (err) {
        threw = true;
        result = err.message;
      }
      issueCommand(
        new TextEncoder().encode(
          // Replace JSON-incompatible values with surrogates.
          JSON.stringify({ threw, result }, (_key, value) => {
            switch (typeof value) {
              case 'bigint': return \`\${value}n\`;
              case 'undefined': return '<undefined>';
              default: return value;
            }
          }),
        ).buffer,
      );
    `);
  } finally {
    await vat.close();
  }
  return JSON.parse(opts.messages[0]);
};

/** @returns {XSnapOptions & { messages: string[] }} */
function xsnapTestOptions() {
  const messages = [];
  return {
    name: 'eip712-normalize xs test',
    stderr: 'inherit',
    stdout: 'inherit',
    spawn: io.spawn,
    fs: { ...io.fs, ...io.fs.promises, tmpName: io.tmpName },
    os: io.os,
    handleCommand: async message => {
      messages.push(new TextDecoder().decode(message));
      return new Uint8Array();
    },
    messages,
  };
}

const VALID_ADDRESS_0 = '0x0000000000000000000000000000000000000001';
const VALID_ADDRESS_1 = '0x0000000000000000000000000000000000000002';

test('rejects an invalid element that is not the first element of a dynamic array, under the real XS engine', async t => {
  const input = {
    types: {
      Batch: [{ name: 'signers', type: 'address[]' }],
    },
    message: {
      // A valid address at index 0, an invalid one at index 1: if only
      // index 0 ever gets visited (the XS `Array.from` enumeration bug),
      // this invalid value silently slips through instead of being
      // rejected.
      signers: [VALID_ADDRESS_0, 'not-an-address'],
    },
    primaryType: 'Batch',
  };

  const { threw, result } = await runInXs(input, {});

  t.true(threw, `expected a validation error, got ${JSON.stringify(result)}`);
  if (threw) t.regex(result, /Invalid EIP-712 address/);
});

test('preserves every element of a multi-element array field, under the real XS engine', async t => {
  const input = {
    types: {
      Batch: [{ name: 'signers', type: 'address[]' }],
    },
    message: {
      signers: [VALID_ADDRESS_0, VALID_ADDRESS_1],
    },
    primaryType: 'Batch',
  };

  const { threw, result } = await runInXs(input, {});

  t.false(threw, `expected no validation error, got ${JSON.stringify(result)}`);
  if (!threw) {
    t.deepEqual(result.message.signers, [VALID_ADDRESS_0, VALID_ADDRESS_1]);
  }
});

test('parses and normalizes string-encoded integers, under the real XS engine', async t => {
  const input = {
    types: {
      M: [
        { name: 'dec', type: 'uint256' },
        { name: 'plus', type: 'int256' },
        { name: 'neg', type: 'int256' },
        { name: 'hex', type: 'uint256' },
        { name: 'num', type: 'uint64' },
      ],
    },
    message: {
      dec: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      plus: '+12',
      neg: '-12',
      hex: '0xC',
      num: 7,
    },
    primaryType: 'M',
  };

  const { threw, result } = await runInXs(input, {});

  t.false(threw, `expected no validation error, got ${JSON.stringify(result)}`);
  if (!threw) {
    t.deepEqual(result.message, {
      dec: `${2n ** 256n - 1n}n`,
      plus: '12n',
      neg: '-12n',
      hex: '12n',
      num: '7n',
    });
  }
});

test('rejects an out-of-grammar string-encoded integer, under the real XS engine', async t => {
  const input = {
    types: { M: [{ name: 'v', type: 'int256' }] },
    message: { v: '-0xc' },
    primaryType: 'M',
  };

  const { threw, result } = await runInXs(input, {});

  t.true(threw, `expected a validation error, got ${JSON.stringify(result)}`);
  if (threw) t.regex(result, /int256/);
});

test('keeps and checks struct types referenced only through empty arrays, transitively, under the real XS engine', async t => {
  // Relies on `Map` iteration also visiting entries added while iterating.
  const types = {
    Root: [{ name: 'rows', type: 'Row[][]' }],
    Row: [{ name: 'cell', type: 'Cell' }],
    Cell: [{ name: 'n', type: 'uint256' }],
  };
  const kept = await runInXs(
    { types, message: { rows: [] }, primaryType: 'Root' },
    {},
  );
  t.false(kept.threw, `expected no error, got ${JSON.stringify(kept.result)}`);
  if (!kept.threw) t.deepEqual(kept.result.types, types);

  const checked = await runInXs(
    {
      types: { ...types, Cell: [{ name: 'n', type: 'uint' }] },
      message: { rows: [] },
      primaryType: 'Root',
    },
    {},
  );
  t.true(
    checked.threw,
    `expected an error, got ${JSON.stringify(checked.result)}`,
  );
  if (checked.threw)
    t.regex(checked.result, /Unrecognized EIP-712 type "uint"/);
});
