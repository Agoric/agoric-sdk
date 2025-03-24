import { Buffer } from 'node:buffer';
import { createSHA256 } from '../src/hasher.js';

export async function* getSnapshotStream(contents) {
  yield Buffer.from(contents);
}
harden(getSnapshotStream);

export function makeB0ID(bundle) {
  return `b0-${createSHA256(JSON.stringify(bundle)).finish()}`;
}
