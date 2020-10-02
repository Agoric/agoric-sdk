// this file is loaded by the controller, in the start compartment
import { spawn } from 'child_process';

import { makePromiseKit } from '@agoric/promise-kit';
import { streamDecoder, streamEncoder } from './worker-protocol';

// eslint-disable-next-line no-unused-vars
function parentLog(first, ...args) {
  // console.error(`--parent: ${first}`, ...args);
}

// we send on fd3, and receive on fd4. We pass fd1/2 (stdout/err) through, so
// console log/err from the child shows up normally. We don't use Node's
// built-in serialization feature ('ipc') because the child process won't
// always be Node.
const stdio = harden(['inherit', 'inherit', 'inherit', 'pipe', 'pipe']);

export function startSubprocessWorker(execPath, procArgs = []) {
  const proc = spawn(execPath, procArgs, { stdio });

  const toChild = streamEncoder(data => proc.stdio[3].write(data));
  // proc.stdio[4].setEncoding('utf-8');
  const fromChild = streamDecoder(proc.stdio[4]);

  // (await fromChild.next()).data
  // toChild('hello child');

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

  return harden({
    fromChild,
    toChild,
    terminate,
    done: pk.promise,
  });
}
