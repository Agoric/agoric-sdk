import { Far } from '@endo/marshal';

export function buildRootObject() {
  console.log(`idle vat initializing`);
  return Far('root', {
    doNothing() {},
  });
}
