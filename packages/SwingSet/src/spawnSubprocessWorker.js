// this file is loaded by the controller, in the start compartment
import { spawn } from 'child_process';
import Netstring from 'netstring-stream';

import { makePromiseKit } from '@agoric/promise-kit';

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

  const toChild = Netstring.writeStream();
  toChild.pipe(proc.stdio[3]);
  // proc.stdio[4].setEncoding('utf-8');
  const fromChild = proc.stdio[4].pipe(Netstring.readStream());
  fromChild.setEncoding('utf-8');

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

  // the Netstring objects don't like being hardened, so we wrap the methods
  // that get used
  const wrappedFromChild = {
    on: (evName, f) => fromChild.on(evName, f),
  };
  const wrappedToChild = {
    write: data => toChild.write(data),
  };

  return harden({
    fromChild: wrappedFromChild,
    toChild: wrappedToChild,
    terminate,
    done: pk.promise,
  });
}
