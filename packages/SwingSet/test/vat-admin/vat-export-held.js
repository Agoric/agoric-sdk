import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    createHeld: () => Far('held', {}),
  });
}
