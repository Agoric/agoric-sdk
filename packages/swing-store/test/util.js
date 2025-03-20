import { Buffer } from 'node:buffer';
import tmp from 'tmp';
import { createSHA256 } from '../src/hasher.js';

/**
 * @param {string} [prefix]
 * @returns {[string, () => void]}
 */
export const tmpDir = prefix => {
  const { name, removeCallback } = tmp.dirSync({ prefix, unsafeCleanup: true });
  return [name, removeCallback];
};

export async function* getSnapshotStream(contents) {
  yield Buffer.from(contents);
}
harden(getSnapshotStream);

export function makeB0ID(bundle) {
  return `b0-${createSHA256(JSON.stringify(bundle)).finish()}`;
}
