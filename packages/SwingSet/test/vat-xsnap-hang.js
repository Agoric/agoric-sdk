import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  return Far('root', {
    hang() { for (;;) {} },
  });
}
