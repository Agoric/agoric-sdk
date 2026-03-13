import { Far } from '@endo/far';

export function buildRootObject() {
  let vatStrongRef;
  return Far('root', {
    bootstrap(vats, _devices) {
      vatStrongRef = vats;
    },
  });
}
