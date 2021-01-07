// @ts-check

/**
 * @template T
 * @typedef {import('./defer').Deferred<T>} Deferred
 */

import { spawn } from 'child_process';
import { defer } from './defer';
import * as netstring from './netstring';
import * as node from './node-stream';

const OK = ".".charCodeAt(0);
const ERROR = "!".charCodeAt(0);
const QUERY = "?".charCodeAt(0);

const xsnapBin = new URL('../build/bin/debug/xsnap', import.meta.url).pathname;

const encoder = new TextEncoder();

/**
 * @param {Object} options
 * @param {(request:ArrayBuffer) => Promise<ArrayBuffer>} options.answerSysCall
 * @param {string=} [options.name]
 * @param {string=} [options.snapshot]
 * @param {'ignore' | 'inherit'} [options.stdout]
 * @param {'ignore' | 'inherit'} [options.stderr]
 */
export function xsnap(options) {
  const {
    name = '<unnamed xsnap worker>',
    answerSysCall,
    snapshot = undefined,
    stdout = 'inherit',
    stderr = 'inherit',
  } = options;

  /** @type {Deferred<Error?>} */
  const vatExit = defer();

  const args = snapshot ? [ '-r', snapshot ] : [];

  const xsnap = spawn(xsnapBin, args, {
    stdio: ['ignore', stdout, stderr, 'pipe', 'pipe'],
  });

  xsnap.on('exit', code => {
    if (code === 0 || code === null) {
      vatExit.resolve(null);
    } else {
      vatExit.reject(new Error(`${name} exited with code ${code}`));
    }
  });

  const messagesToXsnap = netstring.writer(node.writer(/** @type{NodeJS.WritableStream} */(xsnap.stdio[3])));
  const messagesFromXsnap = netstring.reader(/** @type{AsyncIterable<ArrayBuffer>} */(xsnap.stdio[4]));

  /** @type {Promise<Error?>} */
  let baton = Promise.resolve(null);

  /**
   * @returns {Promise<Error?>}
   */
  async function runToIdle() {
    for (;;) {
      const {done, value: message} = await messagesFromXsnap.next();
      if (done) {
        xsnap.kill();
        throw new Error('xsnap protocol error: unexpected end of output');
      }
      if (message.byteLength === 0) {
        // A protocol error kills the xsnap child process and breaks the baton
        // chain with a terminal error.
        xsnap.kill();
        throw new Error('xsnap protocol error: received empty message');
      } else if (message[0] === OK) {
        return null;
      } else if (message[0] === ERROR) {
        // TODO carry exception body in payload.
        // We return the error, which will eventually return to the sender
        // through the baton, but does not break the chain of commands they can
        // send to the xsnap instance.
        return new Error(`Uncaught exception in ${name}`);
      } else if (message[0] === QUERY) {
        await messagesToXsnap.next(await answerSysCall(message.subarray(1)));
      }
    }
  }

  /**
   * @param {string} code
   * @returns {Promise<Error?>}
   */
  async function evaluate(code) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`e${code}`));
      return runToIdle();
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @param {string} fileName
   * @returns {Promise<Error?>}
   */
  async function execute(fileName) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`s${fileName}`));
      return runToIdle();
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @param {string} fileName
   * @returns {Promise<Error?>}
   */
  async function importModule(fileName) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`m${fileName}`));
      return runToIdle();
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @param {string} message
   * @returns {Promise<Error?>}
   */
  async function send(message) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`d${message}`));
      return runToIdle();
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @param {string} file
   * @returns {Promise<Error?>}
   */
  async function writeSnapshot(file) {
    baton = baton.then(async () => {
      await messagesToXsnap.next(encoder.encode(`w${file}`));
      return runToIdle();
    });
    return Promise.race([vatExit.promise, baton]);
  }

  /**
   * @returns {Promise<void>}
   */
  async function close() {
    xsnap.kill();
    baton = Promise.reject(new Error(`xsnap closed`));
    baton.catch(() => {}); // Suppress Node.js unhandled exception warning.
    return vatExit.promise;
  }

  return { send, close, evaluate, execute, import: importModule, snapshot: writeSnapshot };
}
