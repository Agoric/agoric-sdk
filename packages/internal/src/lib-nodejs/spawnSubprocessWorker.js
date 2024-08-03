// this file is loaded by the controller, in the start compartment
import { spawn } from 'child_process';
import { makePromiseKit } from '@endo/promise-kit';
import { NonNullish } from '../errors.js';
import { arrayEncoderStream, arrayDecoderStream } from './worker-protocol.js';
import {
  netstringEncoderStream,
  netstringDecoderStream,
} from '../netstring.js';

// Start a subprocess from a given executable, and arrange a bidirectional
// message channel with a "supervisor" within that process. Return a {
// toChild, fromChild } pair of Streams which accept/emit hardened Arrays of
// JSON-serializable data.

// eslint-disable-next-line no-unused-vars
function parentLog(first, ...args) {
  // console.error(`--parent: ${first}`, ...args);
}

/** @typedef {import('child_process').IOType} IOType */
/** @typedef {import('stream').Writable} Writable */

// we send on fd3, and receive on fd4. We pass fd1/2 (stdout/err) through, so
// console log/err from the child shows up normally. We don't use Node's
// built-in serialization feature ('ipc') because the child process won't
// always be Node.
/** @type {IOType[]} */
const stdio = harden(['inherit', 'inherit', 'inherit', 'pipe', 'pipe']);

export function startSubprocessWorker(
  execPath,
  procArgs = [],
  { netstringMaxChunkSize = undefined } = {},
) {
  const proc = spawn(execPath, procArgs, { stdio });

  const toChild = arrayEncoderStream();
  toChild
    .pipe(netstringEncoderStream())
    .pipe(/** @type {Writable} */ (proc.stdio[3]));
  // proc.stdio[4].setEncoding('utf-8');
  const fromChild = NonNullish(proc.stdio[4])
    .pipe(netstringDecoderStream(netstringMaxChunkSize))
    .pipe(arrayDecoderStream());

  // fromChild.addListener('data', data => parentLog(`fd4 data`, data));
  // toChild.write('hello child');

  const pk = makePromiseKit();

  proc.once('exit', code => {
    parentLog('child exit', code);
    pk.resolve(code);
  });
  proc.once('error', e => {
    parentLog('child error', e);
    pk.reject(e);
  });
  parentLog(`waiting on child`);

  function terminate() {
    proc.kill();
  }

  // the Transform objects don't like being hardened, so we wrap the methods
  // that get used
  /* @type {typeof fromChild} */
  const wrappedFromChild = {
    on: (...args) =>
      fromChild.on(
        .../** @type {Parameters<(typeof fromChild)['on']>} */ (args),
      ),
  };
  /* @type {typeof toChild} */
  const wrappedToChild = {
    write: (...args) =>
      toChild.write(
        .../** @type {Parameters<(typeof toChild)['write']>} */ (args),
      ),
  };

  return harden({
    fromChild: wrappedFromChild,
    toChild: wrappedToChild,
    terminate,
    done: pk.promise,
  });
}
