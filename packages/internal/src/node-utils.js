/// <reference types="node" />
// @ts-check
// @jessie-check
/**
 * @file Node.js utility functions that are compatible with but not dependent
 *   upon a hardened environment.
 */

import { makePromiseKit } from '@endo/promise-kit';

/** @import {PromiseKit} from '@endo/promise-kit'; */

const { stringify } = JSON;

/**
 * @typedef {object} CommandResult
 * @property {number | null} status
 * @property {Buffer | null} stdout
 * @property {Buffer | null} stderr
 * @property {string | null} signal
 * @property {Error | null} error
 */

/**
 * @param {{
 *   Buffer: typeof Buffer;
 *   Readable: typeof import('node:stream').Readable;
 *   setImmediate: typeof setImmediate;
 *   spawn: import('node:child_process').spawn;
 * }} powers
 */
export const makeRunCommand = ({ Buffer, Readable, setImmediate, spawn }) => {
  /**
   * Launch a child process with optional standard input and wait for its
   * termination.
   *
   * @param {string} cmd
   * @param {string[]} args
   * @param {{
   *   input?: Parameters<typeof import('node:stream').Readable.from>[0];
   * } & Parameters<typeof spawn>[2]} [options]
   * @returns {Promise<
   *   CommandResult &
   *     ({ error: Error } | { status: number } | { signal: string })
   * >}
   */
  const runCommand = async (cmd, args, { input, ...options } = {}) => {
    const child = spawn(cmd, args, options);
    /** @type {{ stdout: Buffer[]; stderr: Buffer[] }} */
    const outChunks = { stdout: [], stderr: [] };
    const exitKit = makePromiseKit();
    const inKit = child.stdin && makePromiseKit();
    const outKit = child.stdout && makePromiseKit();
    const errKit = child.stderr && makePromiseKit();
    // cf. https://nodejs.org/docs/latest/api/child_process.html#child_processspawnsynccommand-args-options
    /** @type {CommandResult} */
    const result = {
      status: null,
      stdout: null,
      stderr: null,
      signal: null,
      error: null,
    };
    child.on('error', err => {
      result.error = err;
      // An exit event *might* be coming, so wait a tick.
      setImmediate(() => exitKit.resolve('done'));
    });
    child.on('exit', (exitCode, signal) => {
      if (!Object.isFrozen(result)) {
        result.status = exitCode;
        result.signal = signal;
      }
      exitKit.resolve('done');
    });
    /**
     * @type {(
     *   emitter:
     *     | import('node:stream').Readable
     *     | import('node:stream').Writable,
     *   kit: PromiseKit<unknown>,
     *   msg: string,
     * ) => void}
     */
    const rejectOnError = (emitter, kit, msg) => {
      emitter.on('error', err => kit.reject(Error(msg, { cause: err })));
    };
    /**
     * @typedef {[
     *   string,
     *   import('node:stream').Readable | null,
     *   Buffer[],
     *   PromiseKit<unknown>,
     * ]} ReadableKit
     */
    for (const [label, stream, chunks, kit] of /** @type {ReadableKit[]} */ ([
      ['stdout', child.stdout, outChunks.stdout, outKit],
      ['stderr', child.stderr, outChunks.stderr, errKit],
    ])) {
      if (!stream) {
        continue;
      }
      rejectOnError(
        stream,
        kit,
        `failed reading from ${stringify(cmd)} ${label}`,
      );
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => kit.resolve('done'));
    }
    if (child.stdin) {
      const actualInKit = /** @type {PromiseKit<unknown>} */ (inKit);
      rejectOnError(
        child.stdin,
        actualInKit,
        `failed writing to ${stringify(cmd)} stdin`,
      );
      Readable.from(input || []).pipe(child.stdin);
      child.stdin.on('finish', () => actualInKit.resolve('done'));
    } else if (input) {
      throw Error(`missing ${stringify(cmd)} stdin`);
    }
    await Promise.all(
      [exitKit, inKit, outKit, errKit].map(kit => kit?.promise),
    );
    if (outKit) {
      result.stdout = Buffer.concat(outChunks.stdout);
    }
    if (errKit) {
      result.stderr = Buffer.concat(outChunks.stderr);
    }
    Object.freeze(result);
    // @ts-expect-error result really is a CommandResult
    return result;
  };
  return runCommand;
};

/**
 * Decode stdout and/or stderr buffers.
 *
 * @param {CommandResult} commandResult
 * @returns {Pick<CommandResult, 'status' | 'signal' | 'error'> & {
 *   stdout: string | null;
 *   stderr: string | null;
 * }}
 */
export const commandResultData = commandResult => ({
  status: commandResult.status,
  stdout: commandResult.stdout?.toString() ?? null,
  stderr: commandResult.stderr?.toString() ?? null,
  signal: commandResult.signal,
  error: commandResult.error,
});
