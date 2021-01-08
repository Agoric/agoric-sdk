// @ts-check
/* eslint no-await-in-loop: ["off"] */

/**
 * @template T
 * @typedef {import('./defer').Deferred<T>} Deferred
 */

import { spawn } from 'child_process';
import { type as getOsType } from 'os';
import { defer } from './defer';
import * as netstring from './netstring';
import * as node from './node-stream';

const OK = '.'.charCodeAt(0);
const ERROR = '!'.charCodeAt(0);
const QUERY = '?'.charCodeAt(0);

const importMetaUrl = `file://${__filename}`;

const osType = getOsType();
const platform = {
  Linux: 'lin',
  Darwin: 'mac',
  Windows_NT: 'win',
}[osType];

if (platform === undefined) {
  throw new Error(`xsnap does not support platform ${osType}`);
}

const xsnapBin = new URL(
  `../build/bin/${platform}/release/xsnap`,
  importMetaUrl,
).pathname;
const xsnapDebugBin = new URL(
  `../build/bin/${platform}/debug/xsnap`,
  importMetaUrl,
).pathname;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {Uint8Array} arg
 * @returns {Uint8Array}
 */
function echoSysCall(arg) {
  return arg;
}

/**
 * @param {Object} options
 * @param {(request:Uint8Array) => Promise<Uint8Array>} [options.answerSysCall]
 * @param {string=} [options.name]
 * @param {boolean=} [options.debug]
 * @param {string=} [options.snapshot]
 * @param {'ignore' | 'inherit'} [options.stdout]
 * @param {'ignore' | 'inherit'} [options.stderr]
 */
export function xsnap(options) {
  const {
    name = '<unnamed xsnap worker>',
    answerSysCall = echoSysCall,
    debug = false,
    snapshot = undefined,
    stdout = 'inherit',
    stderr = 'inherit',
  } = options;

  /** @type {Deferred<Error?>} */
  const vatExit = defer();

  const args = snapshot ? ['-r', snapshot] : [];

  const bin = debug ? xsnapDebugBin : xsnapBin;

  const xsnapProcess = spawn(bin, args, {
    stdio: ['ignore', stdout, stderr, 'pipe', 'pipe'],
  });

  xsnapProcess.on('exit', code => {
    if (code === 0 || code === null) {
      vatExit.resolve(null);
    } else {
      vatExit.reject(new Error(`${name} exited with code ${code}`));
    }
  });

  const vatCancelled = vatExit.promise.then(() =>
    Promise.reject(new Error(`${name} exited`)),
  );

  const messagesToXsnap = netstring.writer(
    node.writer(/** @type {NodeJS.WritableStream} */ (xsnapProcess.stdio[3])),
  );
  const messagesFromXsnap = netstring.reader(
    /** @type {AsyncIterable<Uint8Array>} */ (xsnapProcess.stdio[4]),
  );

  /** @type {Promise<Error?>} */
  let baton = Promise.resolve(null);

  /**
   * @returns {Promise<Uint8Array>}
   */
  async function runToIdle() {
    for (;;) {
      const { done, value: message } = await messagesFromXsnap.next();
      if (done) {
        xsnapProcess.kill();
        throw new Error('xsnap protocol error: unexpected end of output');
      }
      if (message.byteLength === 0) {
        // A protocol error kills the xsnap child process and breaks the baton
        // chain with a terminal error.
        xsnapProcess.kill();
        throw new Error('xsnap protocol error: received empty message');
      } else if (message[0] === OK) {
        return message.subarray(1);
      } else if (message[0] === ERROR) {
        throw new Error(`Uncaught exception in ${name}`);
      } else if (message[0] === QUERY) {
        await messagesToXsnap.next(await answerSysCall(message.subarray(1)));
      }
    }
  }

  /**
   * @param {string} code
   * @returns {Promise<null>}
   */
  async function evaluate(code) {
    const result = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`e${code}`));
      await runToIdle();
      return null;
    });
    baton = result.catch(() => null);
    return Promise.race([vatCancelled, result]);
  }

  /**
   * @param {string} fileName
   * @returns {Promise<Error?>}
   */
  async function execute(fileName) {
    const result = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`s${fileName}`));
      await runToIdle();
      return null;
    });
    baton = result.catch(() => null);
    return Promise.race([vatCancelled, result]);
  }

  /**
   * @param {string} fileName
   * @returns {Promise<Error?>}
   */
  async function importModule(fileName) {
    const result = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`m${fileName}`));
      await runToIdle();
      return null;
    });
    baton = result.catch(() => null);
    return Promise.race([vatCancelled, result]);
  }

  /**
   * @param {Uint8Array} message
   * @returns {Promise<Uint8Array>}
   */
  async function sysCall(message) {
    const result = baton.then(async () => {
      const request = new Uint8Array(message.length + 1);
      request[0] = QUERY;
      request.set(message, 1);
      await messagesToXsnap.next(request);
      return runToIdle();
    });
    baton = result.then(
      () => {},
      err => err,
    );
    return Promise.race([vatCancelled, result]);
  }

  /**
   * @param {string} message
   * @returns {Promise<string>}
   */
  async function stringSysCall(message) {
    return decoder.decode(await sysCall(encoder.encode(message)));
  }

  /**
   * @param {string} file
   * @returns {Promise<Error?>}
   */
  async function writeSnapshot(file) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`w${file}`));
      return runToIdle().catch(err => err);
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @returns {Promise<Error?>}
   */
  async function close() {
    xsnapProcess.kill();
    baton = Promise.reject(new Error(`xsnap closed`));
    baton.catch(() => {}); // Suppress Node.js unhandled exception warning.
    return vatExit.promise;
  }

  return {
    sysCall,
    stringSysCall,
    close,
    evaluate,
    execute,
    import: importModule,
    snapshot: writeSnapshot,
  };
}
