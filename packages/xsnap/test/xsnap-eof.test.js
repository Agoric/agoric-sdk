import test from 'ava';
import * as proc from 'child_process';
import * as os from 'os';
import fs from 'fs';
import { fileURLToPath, URL } from 'url';
import { tmpName } from 'tmp';
import { text } from 'stream/consumers';
import { makeNetstringWriter } from '@endo/netstring';
import { makeNodeWriter } from '@endo/stream-node';
import { makePromiseKit } from '@endo/promise-kit';
import { options } from './message-tools.js';
import { xsnap, QUERY_RESPONSE_BUF } from '../src/xsnap.js';
import { ExitCode } from '../api.js';

/**
 * @import { Readable, Writable, Duplex } from 'stream'
 */

/**
 * @typedef {Omit<import("child_process").ChildProcess, 'stdio'> &
 *   {
 *     stdin: null;
 *     stdout: null;
 *     stderr: Readable;
 *     readonly stdio: [null, null, Readable, Duplex, Duplex, undefined, undefined, Duplex, Duplex];
 *   }
 * } XsnapChildProcess
 */

test('xsnap-worker complains while waiting for answer when parent is killed', async t => {
  const exitedPKit = makePromiseKit();

  const child =
    /** @type {import("child_process").ChildProcessWithoutNullStreams} */ (
      proc.fork(
        fileURLToPath(
          new URL(
            './fixture-xsnap-kill-parent-in-handlecommand.js',
            import.meta.url,
          ),
        ),
        { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
      )
    );

  const outP = text(child.stdout);
  const errP = text(child.stderr);

  child.on('error', err => {
    exitedPKit.reject(err);
  });

  child.on('exit', (code, signal) => {
    exitedPKit.resolve({ code, signal });
  });

  const [strOut, strErr, { code: nodeExitCode, signal: nodeExitSignal }] =
    await Promise.all([outP, errP, exitedPKit.promise]);

  t.is(strOut, '', 'stdout must be empty');
  t.regex(
    strErr,
    /Has parent died\?/,
    'stderr must contain "Has parent died?"',
  );
  t.is(nodeExitCode, null, 'exit code must be null');
  t.is(nodeExitSignal, 'SIGKILL', 'exit signal must be "SIGKILL"');
});

async function spawnReflectiveWorker(handleCommand) {
  const exitedPKit = makePromiseKit();
  /** @type {XsnapChildProcess | undefined} */
  let xsnapProcess;

  /** @type {typeof import('child_process').spawn} */
  const spawnSpy = (...args) => {
    // @ts-expect-error overloaded signature
    const cp = proc.spawn(...args);
    xsnapProcess = cp;
    return cp;
  };

  const io = { spawn: spawnSpy, os: os.type(), fs, tmpName };
  const vat = await xsnap({ ...options(io), handleCommand, stderr: 'pipe' });
  await vat.evaluate(
    'function handleCommand(message) { issueCommand(new Uint8Array().buffer); };',
  );

  assert(xsnapProcess);

  const toXsnap = xsnapProcess.stdio[3];
  const fromXsnap = xsnapProcess.stdio[4];
  const stderrP = text(xsnapProcess.stderr);

  xsnapProcess.on('error', err => {
    exitedPKit.reject(err);
  });

  xsnapProcess.on('exit', (code, signal) => {
    exitedPKit.resolve({ code, signal });
  });

  return { vat, xsnapProcess, toXsnap, fromXsnap, stderrP, exitedPKit };
}

async function issueCommandAndWait(worker) {
  let issueCommandError;
  let vatCloseError;
  const { vat, stderrP, exitedPKit } = worker;

  try {
    // this will error out since we are intentionally
    // breaking communications with the worker
    await vat.issueStringCommand('0');
  } catch (err) {
    issueCommandError = err;
  }

  // wait for the worker to exit
  const [strErr, { code: vatExitCode, signal: vatExitSignal }] =
    await Promise.all([stderrP, exitedPKit.promise]);

  try {
    // this will error out since vat has died.
    await vat.close();
  } catch (err) {
    vatCloseError = err;
  }
  return {
    issueCommandError,
    vatCloseError,
    strErr,
    vatExitCode,
    vatExitSignal,
  };
}

const testInterruption = test.macro(async (t, onRequest, expectedStderr) => {
  const handleCommand = message => {
    // @ts-expect-error onRequest is untyped
    // eslint-disable-next-line no-use-before-define
    return onRequest(worker, message);
  };
  const worker = await spawnReflectiveWorker(handleCommand);

  const {
    issueCommandError,
    vatCloseError,
    strErr,
    vatExitCode,
    vatExitSignal,
  } = await issueCommandAndWait(worker);

  t.not(issueCommandError, undefined, 'issueCommand() must produce an error');
  t.not(vatCloseError, 'vat.close() must produce an error');
  t.is(vatExitSignal, null, 'vat exit signal must be null');
  t.is(
    vatExitCode,
    ExitCode.E_IO_ERROR,
    'vat exit code must indicate an IO error',
  );
  t.is(strErr, expectedStderr, 'stderr must indicate expected error');
});

test(
  'xsnap-worker complains while trying to READ an answer when pipes are closed',
  testInterruption,
  async function onRequest(worker, _message) {
    // the worker is blocked on read here, so we should close "fromXsnap" pipe first
    worker.fromXsnap.end();
    worker.fromXsnap.destroy();
    worker.toXsnap.end();
    worker.toXsnap.destroy();
    return new Uint8Array();
  },
  'Got EOF on netstring read. Has parent died?\n',
);

test(
  'xsnap-worker complains while trying to WRITE an answer when pipes are closed',
  testInterruption,
  async function onRequest(worker, _message) {
    // the worker is blocked on read here, so we should close "fromXsnap" pipe first
    worker.fromXsnap.end();
    worker.fromXsnap.destroy();
    // write a fake but valid response into a pipe buffer,
    // forcing the worker to move to the next state where it would
    // attempt to write out return value from its own "handleCommand()"
    // into a pipe which we've just closed above.
    await makeNetstringWriter(makeNodeWriter(worker.toXsnap)).next([
      QUERY_RESPONSE_BUF,
      new Uint8Array(),
    ]);
    worker.toXsnap.end();
    worker.toXsnap.destroy();
    return new Uint8Array();
  },
  'Caught SIGPIPE. Has parent died?\n',
);
