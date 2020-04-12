// @ts-check
import fs from 'fs';
import tmp from 'tmp';
import { spawn } from 'child_process';
import { RETRY_POLL, makeBlocker } from '@agoric/swing-blocker';

const FIFO_TYPE = 'fifo';

/**
 * @typedef {import('@agoric/swing-blocker').BlockerReturn<FifoBlockerSpec>} BlockerReturn
 * @typedef {import('@agoric/swing-blocker').BlockerSpec} BlockerSpec
 * @typedef {BlockerSpec & { fifoPath: string }} FifoBlockerSpec
 * @typedef {typeof import('@agoric/swing-blocker').registerBlocker} RegisterBlocker
 */
/**
 * @template T
 * @typedef {import('@agoric/swing-blocker').Poller<T>} Poller
 */
/**
 * @template T
 * @typedef {import('@agoric/swing-blocker').Blocker<T>} Blocker
 */

/**
 * The main type information for this blocker.
 * @type {BlockerSpec}
 */
const baseFifoBlockerSpec = {
  type: FIFO_TYPE,
  scope: 'Kernel',
};

/**
 * Create a FIFO for use in makeSwingSync and makeWakeFifo.
 * @returns {Promise<BlockerReturn>} the FIFO details
 */
export function makeFifo() {
  return new Promise((resolve, reject) => {
    tmp.tmpName((err, path) => {
      if (err) {
        reject(err);
        return;
      }

      const cp = spawn('mkfifo', [path], { stdio: 'inherit' });
      cp.addListener('close', code => {
        if (code !== 0) {
          reject(Error(`Cannot create FIFO: ${code}`));
          return;
        }

        const cleanup = () => {
          // Wake up callers so they notice we're gone.
          fs.writeFileSync(path, '');
          // Delete the FIFO.
          fs.unlinkSync(path);
        };

        // We have an initialized FIFO.
        resolve([
          {
            ...baseFifoBlockerSpec,
            fifoPath: path,
          },
          cleanup,
        ]);
      });
    });
  });
}

/**
 * Create a function that unblocks a given FIFO to allow the poll to retry.
 * @param {FifoBlockerSpec} meta the metadata describing the FIFO
 * @returns {() => void} the unblocker
 */
export function makeFifoUnblocker({ fifoPath }) {
  return () => {
    fs.writeFileSync(fifoPath, '');
  };
}

/**
 * Return a Blocker function for this type.
 *
 * @template T
 * @param {FifoBlockerSpec} meta the metadata describing the FIFO
 * @param {Poller<T>} poll the poller
 * @returns {Blocker<T>} the blocker
 */
export function makeFifoBlockerWithPoll({ fifoPath }, poll) {
  return makeBlocker((...args) => {
    const result = poll(...args);
    if (result !== RETRY_POLL) {
      return result;
    }
    fs.readFileSync(fifoPath);
    return RETRY_POLL;
  });
}

/**
 * Register our FIFO implementation with the `get*` functions.
 * @param {RegisterBlocker} registerBlocker
 */
export function register(registerBlocker) {
  registerBlocker(
    baseFifoBlockerSpec,
    makeFifoBlockerWithPoll,
    makeFifoUnblocker,
  );
}
