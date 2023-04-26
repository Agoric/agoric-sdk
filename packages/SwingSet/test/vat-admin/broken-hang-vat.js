import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  const pk = makePromiseKit();
  return pk.promise; // never resolves
}
