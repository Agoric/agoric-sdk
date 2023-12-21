import path from 'path';
import { Buffer } from 'buffer';

/**
 * This is a polyfill for the `buffer` function from Node's
 * 'stream/consumers' package, which unfortunately only exists in newer versions
 * of Node.
 *
 * @param {import('./exporter.js').AnyIterable<Uint8Array>} inStream
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
