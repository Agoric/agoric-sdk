#!/usr/bin/env node
// @ts-check
/* eslint no-await-in-loop: ["off"] */

/**
 * @template T
 * @typedef {import('./defer').Deferred<T>} Deferred
 */
import * as readline from 'readline';
import { xsnap } from './xsnap';
import { defer } from './defer';

const decoder = new TextDecoder();

async function main() {
  /**
   * For the purposes of the REPL, the only syscall is effectively `print`.
   *
   * @param {Uint8Array} message
   * @returns {Promise<Uint8Array>}
   */
  async function answerSysCall(message) {
    console.log(decoder.decode(message));
    return new Uint8Array();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let vat = xsnap({ answerSysCall });

  await vat.evaluate(`
    const compartment = new Compartment();
    function answerSysCall(request) {
      const command = String.fromArrayBuffer(request);
      let result = compartment.evaluate(command);
      if (result === undefined) {
        result = null;
      }
      sysCall(ArrayBuffer.fromString(JSON.stringify(result, null, 4)));
    }
  `);

  /**
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  function ask(prompt) {
    const { promise, resolve } = /** @type {Deferred<string>} */ (defer());
    rl.question(prompt, resolve);
    return promise;
  }

  for (;;) {
    const answer = await ask('xs> ');
    if (answer === 'exit' || answer === 'quit') {
      break;
    } else if (answer === 'load') {
      const file = await ask('file> ');
      await vat.close();
      vat = xsnap({ answerSysCall, snapshot: file });
    } else if (answer === 'save') {
      const file = await ask('file> ');
      await vat.snapshot(file);
    } else {
      await vat.send(answer);
    }
  }

  rl.close();
  return vat.close();
}

main();
