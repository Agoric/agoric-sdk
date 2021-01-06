// @ts-check

import { defer } from './defer';

/**
 * @param {NodeJS.WritableStream} output
 * @returns {AsyncIterableIterator<void, Uint8Array>}
 */
async function* adaptWriter(output) {
  let drained = defer();

  output.on('error', err => {
    console.log('err', err);
    drained.reject(err);
  });

  output.on('drain', () => {
    drained.resolve(undefined);
    drained = defer();
  });

  try {
    for (;;) {
      if (!output.write(yield)) {
        await drained.promise;
      }
    }
  } finally {
    output.end();
  }
}

/**
 * Adapts a Node.js writable stream to a JavaScript
 * async iterator of Uint8Array data chunks.
 * Back pressure emerges from awaiting on the promise
 * returned by `next` before calling `next` again.
 *
 * @param {NodeJS.WritableStream} output
 * @returns {AsyncIterableIterator<void, Uint8Array>}
 */
export function writer(output) {
  const adapter = adaptWriter(output);
  adapter.next(); // Advance to first yield.
  return adapter;
}
