/* global sysCall */
// @ts-check

import './console-shim';
import './text-shim';
import './lockdown-shim';
import '@agoric/eventual-send/shim';

import { main } from './vatWorker';

harden(console);

/**
 * Return a promise for "end of crank"; i.e when the promise
 * queue is empty and hence the vat loses agency.
 *
 * see also: detecting an empty vat promise queue (end of "crank")
 * https://github.com/Agoric/agoric-sdk/issues/45
 *
 * @returns {Promise<void>}
 */
function waitUntilQuiescent() {
  return new Promise((resolve, _reject) => {
    setImmediate(() => {
      // console.log('hello from setImmediate callback. The promise queue is presumably empty.');
      resolve();
    });
  });
}
harden(waitUntilQuiescent);
harden(sysCall);

globalThis.onMessage = main({ waitUntilQuiescent, sysCall });
