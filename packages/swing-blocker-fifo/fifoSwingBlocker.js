// @ts-check
import fs from 'fs';
import tmp from 'tmp';
import { spawn } from 'child_process';
import { makeBlocker } from '@agoric/swing-blocker';

const FIFO_TYPE = 'fifo';

/**
 * @typedef {import('@agoric/swing-blocker').BlockerReturn} BlockerReturn
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
 * Create a FIFO for use in makeSwingSync and makeWakeFifo.
 * @returns {Promise<BlockerReturn>} the FIFO details
 */
export function makeFifo() {
  return new Promise((resolve, reject) => {
    tmp.tmpName((err, path) => {
      if (err) {
        return reject(err);
      }

      const cp = spawn('mkfifo', [path], { stdio: 'inherit' })
      cp.addListener('close', code => {
        if (code !== 0) {
          return reject(Error(`Cannot create FIFO: ${code}`));
        }
        // We have an initialized FIFO.
        resolve({
          meta: {
            type: FIFO_TYPE,
            fifoPath: path,
          },
          cleanup() {
            // Wake up callers so they notice we're gone.
            fs.writeFileSync(path, '');
            // Delete the FIFO.
            fs.unlinkSync(path);
          },
        });
      })
    });
  });
}

/**
 * Create a function that unblocks a given FIFO to allow the poll to retry.
 * @param {{ fifoPath: string }} meta the metadata describing the FIFO
 * @returns {() => void} the unblocker
 */
export function fifoUnblockerFromMeta({ fifoPath }) {
  return () => {
    fs.writeFileSync(fifoPath, '');
  };
}

/**
 * Return a Blocker function for this type.
 *  
 * @template T
 * @param {{ fifoPath: string }} meta the metadata describing the FIFO
 * @param {Poller<T>} poll the poller
 * @returns {Blocker<T>} the blocker
 */
export function fifoBlockerFromMeta({ fifoPath }, poll) {
  return makeBlocker(() => {
    const result = poll();
    if (result !== undefined) {
      return result;
    }
    fs.readFileSync(fifoPath);
  });
}

/**
 * 
 * @param {RegisterBlocker} registerBlocker
 */
export function register(registerBlocker) {
  registerBlocker(FIFO_TYPE, fifoBlockerFromMeta, fifoUnblockerFromMeta);
}
