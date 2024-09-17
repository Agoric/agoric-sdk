/* global setTimeout */

import test from 'ava';
import * as proc from 'child_process';
import * as os from 'os';
import fs from 'fs';
import process from 'node:process';
import { tmpName } from 'tmp';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function waitFor(conditionFn) {
  while (!conditionFn()) {
    await sleep(100);
  }
}

test('xsnap-worker complains while waiting for answer when parent is killed', async t => {
  const parentText = `
        import * as proc from 'child_process';
        import * as os from 'os';
        import fs from 'fs';
        import process from 'node:process';
        import { tmpName } from 'tmp';
        import '@endo/init';
        import { xsnap } from '../src/xsnap.js';
        import { options, decode, encode, loader } from './message-tools.js';
        import console from 'console';
        const io = { spawn: proc.spawn, os: os.type(), fs, tmpName };

        async function handleCommand(message) {
            process.kill(process.pid, 'SIGKILL');
            return new Uint8Array();
        }

        const vat = await xsnap({ ...options(io), handleCommand });
        await vat.evaluate('function handleCommand(message) { issueCommand(new Uint8Array().buffer); };');
        await vat.issueStringCommand('0');
        console.error('Error: parent was not killed!');
        await vat.close();
    `;

  let nodeExited = false;
  let nodeError = null;
  let nodeExitCode = null;
  let nodeExitSignal = null;
  let strOut = '';
  let strErr = '';

  const p = proc.spawn('node', ['--input-type=module', '-e', parentText], {
    cwd: `${process.cwd()}/test`,
  });

  p.stdout.on('data', data => {
    strOut = `${strOut}${data}`;
  });

  p.stderr.on('data', data => {
    strErr = `${strErr}${data}`;
  });

  p.on('error', err => {
    nodeError = err;
  });

  p.on('exit', (code, signal) => {
    nodeExited = true;
    nodeExitCode = code;
    nodeExitSignal = signal;
  });

  p.stdin.end();

  await waitFor(() => {
    return nodeExited;
  });

  t.is(`${strOut}`, ``, 'wrong stdout output');
  t.regex(`${strErr}`, /Has parent died\?/, 'wrong stderr output');
  t.is(nodeError, null, 'parent returned an error');
  t.is(nodeExited, true, 'parent did not exit');
  t.is(nodeExitCode, null, 'parent exit code is not null');
  t.is(`${nodeExitSignal}`, `SIGKILL`, 'wrong parent exit signal');
});

async function doSetup(handleCommand) {
  let xsnapProcess;
  const spawnSpy = (...args) => {
    xsnapProcess = proc.spawn(...args);
    return xsnapProcess;
  };

  const io = { spawn: spawnSpy, os: os.type(), fs, tmpName };
  const vat = await xsnap({ ...options(io), handleCommand, stderr: 'pipe' });
  await vat.evaluate(
    'function handleCommand(message) { issueCommand(new Uint8Array().buffer); };',
  );
  return { vat, xsnapProcess };
}

test('xsnap-worker complains while trying to READ an answer when pipes are closed', async t => {
  let xsnapProcess;
  let toXsnap;
  let fromXsnap;
  let issueCommandError;
  let vatCloseError;
  let vatExitCode;
  let vatExitSignal;
  let strErr = '';

  async function handleCommand(_message) {
    // suspend the child process so the pipes appear
    // to close atomically from its perspective
    xsnapProcess.kill('SIGSTOP');
    // wait for signal delivery
    await waitFor(() => {
      return xsnapProcess.killed;
    });

    // close the pipes
    toXsnap.end();
    toXsnap.destroy();
    fromXsnap.end();
    fromXsnap.destroy();

    // un-suspend the child process
    xsnapProcess.kill('SIGCONT');
    // wait for signal delivery
    await waitFor(() => {
      return xsnapProcess.killed;
    });

    return new Uint8Array();
  }

  const setup = await doSetup(handleCommand);
  const { vat } = setup;
  ({ xsnapProcess } = setup);

  toXsnap = xsnapProcess.stdio[3];
  fromXsnap = xsnapProcess.stdio[4];

  xsnapProcess.on('exit', (code, signal) => {
    vatExitCode = code;
    vatExitSignal = signal;
  });

  xsnapProcess.stdio[2].on('data', data => {
    strErr = `${strErr}${data}`;
  });

  try {
    // this will error out since we are intentionally
    // breaking communications with the worker
    await vat.issueStringCommand('0');
  } catch (err) {
    issueCommandError = err;
  }

  // wait for the child to exit
  await waitFor(() => {
    return vatExitCode || vatExitSignal;
  });

  try {
    // this will error out since vat has died.
    await vat.close();
  } catch (err) {
    vatCloseError = err;
  }
  t.truthy(issueCommandError, 'issueCommand() did not error out');
  t.truthy(vatCloseError, 'vat.close() did not error out');
  t.falsy(vatExitSignal, 'wrong vat exit signal');
  t.is(vatExitCode, 2 /* E_IO_ERROR */, 'wrong vat exit code');
  t.is(
    strErr,
    'Got EOF on netstring read. Has parent died?\n',
    'wrong vat stderr message',
  );
});

test('xsnap-worker complains while trying to WRITE when pipes are closed', async t => {
  let xsnapProcess;
  let toXsnap;
  let fromXsnap;
  let issueCommandError;
  let vatCloseError;
  let vatExitCode;
  let vatExitSignal;
  let strErr = '';

  async function handleCommand(_message) {
    // suspend the child process so the pipes appear
    // to close atomically from its perspective
    await xsnapProcess.kill('SIGSTOP');
    // wait for signal delivery
    await waitFor(() => {
      return xsnapProcess.killed;
    });
    fromXsnap.end();
    fromXsnap.destroy();
    // write a fake but valid response into a pipe buffer,
    // forcing the worker to move to the next state where it would
    // attempt to write out return value from its own "handleCommand()"
    // into a pipe which we've just closed above.
    toXsnap.write('2:/0,\n');
    toXsnap.end();
    toXsnap.destroy();

    // Release the kraken!
    await xsnapProcess.kill('SIGCONT');
    // wait for signal delivery
    await waitFor(() => {
      return xsnapProcess.killed;
    });

    //
    return new Uint8Array();
  }

  const setup = await doSetup(handleCommand);
  const { vat } = setup;
  ({ xsnapProcess } = setup);

  toXsnap = xsnapProcess.stdio[3];
  fromXsnap = xsnapProcess.stdio[4];

  xsnapProcess.on('exit', (code, signal) => {
    vatExitCode = code;
    vatExitSignal = signal;
  });

  xsnapProcess.stdio[2].on('data', data => {
    strErr = `${strErr}${data}`;
  });

  try {
    // this will error out since we are intentionally
    // breaking communications with the worker
    await vat.issueStringCommand('0');
  } catch (err) {
    issueCommandError = err;
  }

  // wait for the child to exit
  await waitFor(() => {
    return vatExitCode || vatExitSignal;
  });

  try {
    // this will error out since vat has died.
    await vat.close();
  } catch (err) {
    vatCloseError = err;
  }

  t.truthy(issueCommandError, 'issueCommand() did not error out');
  t.truthy(vatCloseError, 'vat.close() did not error out');
  t.falsy(vatExitSignal, 'wrong vat exit signal');
  t.is(vatExitCode, 2 /* E_IO_ERROR */, 'wrong vat exit code');
  t.is(
    strErr,
    'Caught SIGPIPE. Has parent died?\n',
    'wrong vat stderr message',
  );
});
