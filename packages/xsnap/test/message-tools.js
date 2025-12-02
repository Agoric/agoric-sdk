const { freeze } = Object;

/**
 * @import {promises} from 'fs';
 * @import {spawn} from 'child_process';
 * @import {XSnapOptions} from '../src/xsnap.js';
 */

// a TextDecoder has mutable state; only export the (pure) decode function
/** @type { TextDecoder['decode'] } */
export const decode = (decoder => decoder.decode.bind(decoder))(
  new TextDecoder(),
);

/** @type { TextEncoder['encode'] } */
export const encode = (encoder => encoder.encode.bind(encoder))(
  new TextEncoder(),
);

/**
 * @param {string} url
 * @param {typeof promises.readFile} [readFile]
 */
export function loader(url, readFile = undefined) {
  /** @param {string} ref */
  const resolve = ref => new URL(ref, url).pathname;
  return freeze({
    resolve,
    /**  @param {string} ref */
    // @ts-expect-error possibly undefined
    asset: async ref => readFile(resolve(ref), 'utf-8'),
  });
}

/**
 * @param {{
 *   spawn: typeof spawn,
 *   os: string,
 *   fs: import('fs'),
 *   tmpName: import('tmp')['tmpName'],
 * }} io
 * @returns {XSnapOptions & { messages: string[]}}
 */
export function options({ spawn, os, fs, tmpName }) {
  const messages = [];

  /** @param {Uint8Array} message */
  async function handleCommand(message) {
    messages.push(decode(message));
    return new Uint8Array();
  }

  return freeze({
    name: 'xsnap test worker',
    stderr: 'inherit',
    stdout: 'inherit',
    spawn,
    fs: { ...fs, ...fs.promises, tmpName },
    os,
    handleCommand,
    messages,
  });
}
