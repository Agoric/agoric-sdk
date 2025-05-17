/* global setTimeout, process */

// This file functions as both an ava-importable module and a standalone script.
// See below for usage detail about the latter.
import 'ses';
import '@endo/eventual-send/shim.js';
// @ts-expect-error Cannot find module
import 'data:text/javascript,try { lockdown(); } catch (_err) {}';

import * as proc from 'child_process';
import * as os from 'os';
import fs from 'fs';
import { tmpName } from 'tmp';
import { parseArgs } from 'util';
import { isMainThread } from 'worker_threads';

import { Nat } from '@endo/nat';
import { makePromiseKit } from '@endo/promise-kit';

import { xsnap } from '../src/xsnap.js';

import { options as makeXSnapOptions } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

/** @import {XSnapOptions} from '@agoric/xsnap/src/xsnap.js' */

/**
 * Creates an Xsnap instance that responds to each inbound command by
 * interpreting it as a decimal count of bytes to retain.
 *
 * @param {Partial<XSnapOptions>} [xsnapOptions]
 * @returns {Promise<Awaited<ReturnType<xsnap>>>}
 */
export const makeRetentiveVat = async xsnapOptions => {
  const vat = await xsnap({ ...makeXSnapOptions(io), ...xsnapOptions });
  // Retain data for each message in a new ArrayBuffer, populating each such
  // buffer with globally descending binary64 values (as buffer space permits)
  // to limit compressibility.
  await vat.evaluate(`
    const decoder = new TextDecoder();
    const buffers = [];
    let x = Number.MAX_SAFE_INTEGER;
    function handleCommand(message) {
      const n = +decoder.decode(message);
      const view = new DataView(new ArrayBuffer(n));
      for (let offset = 0; offset + 8 <= n; offset += 8) {
        view.setFloat64(offset, x);
        x -= 1;
      }
      buffers.push(view.buffer);
    }
  `);
  return vat;
};
harden(makeRetentiveVat);

/**
 * Spawns a heap-preserving sequence of Xsnap instances, each retaining
 * approximately the same amount of additional data.
 *
 * @param {object} options
 * @param {(newVat: Awaited<ReturnType<xsnap>>, loadedSnapshotStream: AsyncIterable<Uint8Array> | undefined) => Promise<void>} [options.afterCommand]
 *   a callback to run after a vat handles its command, for e.g. interrogation and/or
 *   inserting delays between instances
 * @param {number} options.chunkCount the number of instances to spawn
 * @param {number} options.chunkSize the count of bytes to retain per instance
 * @param {Partial<XSnapOptions>} [options.xsnapOptions]
 * @returns {Promise<void>}
 */
export const spawnRetentiveVatSequence = async ({
  afterCommand,
  chunkCount,
  chunkSize,
  xsnapOptions,
}) => {
  await null;
  /** @type {Awaited<ReturnType<xsnap>> | undefined} */
  let vat = undefined;
  try {
    for (let i = 0; i < chunkCount; i += 1) {
      // Make a new vat, replacing a previous vat if present.
      const oldVat = vat;
      const snapshotStream = oldVat?.makeSnapshotStream();
      vat = await makeRetentiveVat({
        ...xsnapOptions,
        snapshotStream,
      });
      await oldVat?.close();

      // Issue the command.
      const label = `command number ${i}`;
      try {
        await vat.issueStringCommand(`${chunkSize}`);
      } catch (err) {
        throw Error(`Error with ${label}`, { cause: err });
      }
      await afterCommand?.(vat, snapshotStream);
    }
  } finally {
    await vat?.close();
  }
};
harden(spawnRetentiveVatSequence);

/**
 * Spawns a heap-preserving sequence of Xsnap instances with intervening delays.
 *
 * @param {object} options
 * @param {number} options.chunkCount
 * @param {number} options.chunkSize
 * @param {number} options.idleDuration
 * @param {Partial<XSnapOptions>} [options.xsnapOptions]
 * @returns {Promise<void>}
 */
const main = async ({ chunkCount, chunkSize, idleDuration, xsnapOptions }) => {
  const afterCommand = async (_vat, _snapshotStream) => {
    const { promise, resolve } = makePromiseKit();
    setTimeout(resolve, idleDuration);
    return promise;
  };
  return spawnRetentiveVatSequence({
    afterCommand,
    chunkCount,
    chunkSize,
    xsnapOptions,
  });
};

const isEntryPoint =
  !/[/]node_modules[/]/.test(process.argv[1]) &&
  // cf. https://github.com/avajs/ava/blob/f8bf00cd988b5e981b6c7d87523a1e0c5dc947c0/lib/worker/guard-environment.cjs
  typeof process.send !== 'function' &&
  isMainThread !== false;
if (isEntryPoint) {
  /** @typedef {{type: 'string' | 'boolean', short?: string, multiple?: boolean, default?: string | boolean | string[] | boolean[]}} ParseArgsOptionConfig */
  /** @type {Record<string, ParseArgsOptionConfig>} */
  const cliOptions = {
    help: { type: 'boolean' },
    chunkCount: {
      type: 'string',
      default: '10',
    },
    chunkSize: {
      type: 'string',
      default: '10000',
    },
    idleDuration: {
      type: 'string',
      default: '10000',
    },
    xsnapOptions: {
      type: 'string',
      default: '{ "snapshotUseFs": false }',
    },
  };
  const { values: config } = parseArgs({ options: cliOptions });
  let chunkCount, chunkSize, idleDuration, xsnapOptions;
  try {
    if (config.help) throw Error();
    const parseNat = str => Nat(/[0-9]/.test(str || '') ? Number(str) : NaN);
    chunkCount = Number(parseNat(config.chunkCount));
    chunkSize = Number(parseNat(config.chunkSize));
    idleDuration = Number(parseNat(config.idleDuration));
    xsnapOptions = JSON.parse(/** @type {string} */ (config.xsnapOptions));
  } catch (err) {
    const log = config.help ? console.log : console.error;
    if (!config.help) log(err.message);
    log(`Usage: node [--inspect-brk] $script \\
  [--chunkCount N (default ${cliOptions.chunkCount.default})] \\
  [--chunkSize BYTE_COUNT (default ${cliOptions.chunkSize.default})] \\
  [--idleDuration MILLISECONDS (default ${cliOptions.idleDuration.default})] \\
  [--xsnapOptions JSON (default ${cliOptions.xsnapOptions.default})]

Spawns a heap-preserving sequence of $chunkCount xsnap instances, each retaining
approximately $chunkSize additional bytes, waiting $idleDuration milliseconds
before spawning each instance's successor.`);
    process.exit(64);
  }
  main({ chunkCount, chunkSize, idleDuration, xsnapOptions }).catch(err => {
    console.error(err);
    process.exitCode ||= 1;
  });
}
