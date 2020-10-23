import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  const theImport = harden({});
  return harden({
    async bootstrap(vats, _devices) {
      const { target } = vats;
      // console.log(`target~.one(theImport)`);
      await E(target).ignore(theImport);
      // ignore() drops theImport immediately, making it available for GC
    },
  });
}
