#!/usr/bin/env node
// @ts-check

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

/** @typedef {(data: Uint8Array) => State} State */

async function main() {
  /** @type{Deferred<boolean>} */
  let vatExit = defer();

  /** @type {State} */
  let state = (_data) => {
    throw new Error('unexpected message');
  };

  let vat = spawn(xsnapBin, {
    stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe', 'ipc'],
  });

  vat.on('close', code => {
    vatExit.resolve(code === 0);
    vatExit = defer();
  });

  const vatInput = writer(nodeWriter(/** @type{Writable} */(vat.stdio[3])));
  const vatOutput = reader(/** @type{AsyncIterable} */(vat.stdio[4]));

  const vatEOF = (async function () {
    for await (const chunk of vatOutput) {
      state = state(chunk);
    }
  })();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  /**
   * @param {string} message
   * @returns {string}
   */
  function handle(message) {
    console.log(message);
    return '';
  }

  /**
   */
  async function runLoop() {
    const {promise, resolve} = defer();
    state = (prior => (/** @type{Uint8Array}*/ data) => {
      const text = decoder.decode(data);
      if (text.startsWith(".")) {
        // syscall from idle
        resolve();
        return prior;
      } else if (text.startsWith("!")) {
        console.error('Uncaught exception!');
        resolve();
        // TODO Death before confusion?
        return prior;
      } else if (text.startsWith("?")) {
        const request = text.slice(1); // TODO safe parse
        const response = handle(request);
        vatInput.next(encoder.encode(response));
        return state;
      }
    })(state);
    return promise;
  }

  await vatInput.next(encoder.encode(`e
    const compartment = new Compartment();
    onMessage = msg => {
      const command = String.fromArrayBuffer(msg);
      let result = compartment.evaluate(command);
      if (result === undefined) {
        result = null;
      }
      sysCall(ArrayBuffer.fromString(JSON.stringify(result, null, 4)));
    };
  `));
  await runLoop();
  
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
    } else {
      await vatInput.next(encoder.encode(`d${answer}`));
      await runLoop();
    }
  }

  rl.close();
  vat.kill();

  return (await Promise.all([
    vatExit.promise,
    vatEOF,
  ])).every(Boolean);
}

main();
