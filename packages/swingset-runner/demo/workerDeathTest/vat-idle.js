import { Far } from '@endo/far';

export function buildRootObject() {
  console.log(`idle vat initializing`);
  return Far('root', {
    doNothing() {},
  });
}
