import { Fail } from '@endo/errors';
import { Buffer } from 'buffer';
import path from 'path';

/**
 * @import {AnyIterable} from './exporter.js';
 */

/**
 * This is a polyfill for the `buffer` function from Node's
 * 'stream/consumers' package, which unfortunately only exists in newer versions
 * of Node.
 *
 * @param {AnyIterable<Uint8Array>} inStream
 */
export const buffer = async inStream => {
  const chunks = [];
  for await (const chunk of inStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export function dbFileInDirectory(dirPath) {
  const filePath = path.resolve(dirPath, 'swingstore.sqlite');
  return filePath;
}

/**
 * @param {string} key
 */
export function getKeyType(key) {
  typeof key === 'string' || Fail`key must be a string`;
  if (key.startsWith('local.')) {
    return 'local';
  } else if (key.startsWith('host.')) {
    return 'host';
  }
  return 'consensus';
}
