#!/usr/bin/env node
// @ts-check

const OK = ".".charCodeAt(0);
const ERROR = "!".charCodeAt(0);
const QUERY = "?".charCodeAt(0);

import * as readline from 'readline';
import { spawn } from 'child_process';
import { reader, writer, nodeWriter } from './netstring.mjs';

const xsnapBin = new URL('../build/bin/debug/xsnap', import.meta.url).pathname;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * @param {boolean} _flag
 * @return {asserts _flag}
 */
function assert(_flag) { }

/**
 * @template T
 * @typedef {{
 *   resolve(value?: T | Promise<T>): void,
 *   reject(error: Error): void,
 *   promise: Promise<T>
 * }} Deferred
 */

/**
 * @template T
 * @return {Deferred<T>}
 */
export function defer() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  assert(resolve !== undefined);
  assert(reject !== undefined);
  return { promise, resolve, reject };
}

/** @typedef {{
 *   write: (chunk: Buffer) => void
 * }} Writable
 */

/** @typedef {(event: 'data', handler: (chunk: Buffer) => void) => void} OnData */
/** @typedef {(event: 'close', handler: () => void) => void} OnClose */
/** @typedef {{ on: OnData & OnClose }} Readable */

/** @typedef {(data: Uint8Array) => Promise<State>} State */

/**
 * @param {(request:Uint8Array) => Promise<Uint8Array>} answerSysCall
 * @param {string=} snapshot
 */
function makeVat(answerSysCall, snapshot = undefined) {
  /** @type{Deferred<boolean>} */
  const vatExit = defer();

  const args = snapshot ? [ '-r', snapshot ] : [];
  const vat = spawn(xsnapBin, args, {
    stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'],
  });

  vat.on('close', code => {
    vatExit.resolve(code === 0);
  });

  const vatInput = writer(nodeWriter(/** @type{Writable} */(vat.stdio[3])));
  const vatOutput = reader(/** @type{AsyncIterable} */(vat.stdio[4]));

  /** @type {State} */
  let state = (_data) => {
    throw new Error('unexpected message');
  };

  async function flush() {
    const {promise, resolve} = defer();
    const prior = state;
    state = async (/** @type{Uint8Array}*/ data) => {
      if (data.byteLength === 0) {
        console.error('no!');
        process.abort(); // TODO handle gracefully.
      } else if (data[0] === OK) {
        resolve();
        return prior;
      } else if (data[0] === ERROR) {
        console.error('Uncaught exception!');
        // TODO carry exception body in trailer.
        resolve();
        return prior;
      } else if (data[0] === QUERY) {
        await vatInput.next(await answerSysCall(data.subarray(1)));
        return state;
      }
    };
    return promise;
  }

  const vatEOF = (async function () {
    for await (const chunk of vatOutput) {
      state = await state(chunk);
    }
  })();

  /**
   * @param {string} code
   * @returns {Promise<void>}
   */
  async function evaluate(code) {
    await vatInput.next(encoder.encode(`e${code}`));
    await flush();
  }

  /**
   * @param {string} message
   * @returns {Promise<void>}
   */
  async function send(message) {
    await vatInput.next(encoder.encode(`d${message}`));
    await flush();
  }

  /**
   * @param {string} file
   * @returns {Promise<void>}
   */
  async function writeSnapshot(file) {
    await vatInput.next(encoder.encode(`w${file}`));
    await flush();
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function close() {
    vat.kill();
    return (await Promise.all([
      vatExit.promise,
      vatEOF,
    ])).every(Boolean);
  }

  return { send, flush, close, evaluate, snapshot: writeSnapshot };
}

async function main() {
  /**
   * @param {Uint8Array} message
   * @returns {Promise<Uint8Array>}
   */
  async function answerSysCall(message) {
    console.log(decoder.decode(message));
    return new Uint8Array();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let vat = makeVat(answerSysCall);

  await vat.evaluate(`
    const compartment = new Compartment();
    onMessage = msg => {
      const command = String.fromArrayBuffer(msg);
      let result = compartment.evaluate(command);
      if (result === undefined) {
        result = null;
      }
      sysCall(ArrayBuffer.fromString(JSON.stringify(result, null, 4)));
    };
  `);
  
  /**
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  function prompt(prompt) {
    const {promise, resolve} = /** @type{Deferred<string>} */(defer());
    rl.question(prompt, resolve);
    return promise;
  }

  for (;;) {
    const answer = await prompt('xs> ');
    if (answer === 'exit' || answer === 'quit') {
      break;

    } else if (answer === 'load') {
      const file = await prompt('file> ');
      await vat.close();
      vat = makeVat(answerSysCall, file);

    } else if (answer === 'save') {
      const file = await prompt('file> ');
      await vat.snapshot(file);

    } else {
      await vat.send(answer);
    }
  }

  rl.close();
  return await vat.close();
}

main();
