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
import blank from 'ts-blank-space';
import { xsnap } from '@agoric/xsnap';

import url from 'node:url';

/**
 * @import {XSnapOptions} from '@agoric/xsnap/src/xsnap.js';
 * @import {NormalizeAndValidateEIP712DataInput, NormalizeAndValidateEIP712DataOptions} from '../../src/utils/viem-utils/eip712-normalize.ts';
 */

const here = url.fileURLToPath(new URL('.', import.meta.url));
const sourcePath = `${here}../../src/utils/viem-utils/eip712-normalize.ts`;

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

/**
 * Loads the real `eip712-normalize.ts` source, strips its types (via
 * `ts-blank-space`, already a devDependency used to run this package's own
 * tests) and its one `export` keyword (module syntax isn't valid in a plain
 * `vat.evaluate` script), so the exact shipped logic -- not a hand-copied
 * approximation of it -- is what runs inside the XS vat.
 */
const loadNormalizeSource = () => {
  const ts = fs.readFileSync(sourcePath, 'utf8');
  const js = blank(ts);
  // Only `export const normalizeAndValidateEIP712Data = (...` remains after
  // blanking (the sole `import type` is blanked away entirely).
  const withoutExport = js.replace(
    'export const normalizeAndValidateEIP712Data',
    'const normalizeAndValidateEIP712Data',
  );
  if (withoutExport === js) {
    throw Error('expected an `export const normalizeAndValidateEIP712Data`');
  }
  return withoutExport;
};

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
  const vat = await xsnap(opts);
  await vat.evaluate(`
    ${loadNormalizeSource()}
    let threw = false;
    let result;
    try {
      result = normalizeAndValidateEIP712Data(
        ${JSON.stringify(input)},
        ${JSON.stringify(options)},
      );
    } catch (err) {
      threw = true;
      result = err.message;
    }
    issueCommand(
      new TextEncoder().encode(JSON.stringify({ threw, result })).buffer,
    );
  `);
  await vat.close();
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
