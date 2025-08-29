import path from 'path';

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
  // Concatenate Uint8Arrays manually
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

export function dbFileInDirectory(dirPath) {
  const filePath = path.resolve(dirPath, 'swingstore.sqlite');
  return filePath;
}
