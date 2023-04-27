import { Far } from '@endo/far';

export function buildRootObject() {
  // eslint-disable-next-line no-unused-vars
  let vatStrongRef;
  return Far('root', {
    bootstrap(vats, _devices) {
      vatStrongRef = vats;
    },
  });
}
