import { E } from '@agoric/eventual-send';
// import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
// import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  return Far('root', {
    async bootstrap(vats) {
      log('message one');
      await E(vats.one).go();
    },
  });
}
