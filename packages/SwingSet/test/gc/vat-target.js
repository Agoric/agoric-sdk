// import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  return harden({
    async ignore(_theImport) {
      // console.log(`ignore()`);
      // we ignore theImport, allowing it to be dropped
    },
  });
}
