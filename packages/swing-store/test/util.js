import { createSHA256 } from '../src/hasher.js';

export async function* getSnapshotStream(contents) {
  yield new TextEncoder().encode(contents);
}
harden(getSnapshotStream);

export function makeB0ID(bundle) {
  return `b0-${createSHA256(JSON.stringify(bundle)).finish()}`;
}
