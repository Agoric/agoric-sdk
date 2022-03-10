import { Far } from '@endo/marshal';

export function buildRootObject() {
  // eslint-disable-next-line no-unused-vars
  let vatStrongRef;
  return Far('root', {
    bootstrap(vats, _devices) {
      vatStrongRef = vats;
    },
  });
}
