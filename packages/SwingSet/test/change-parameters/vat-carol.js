import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    doSomething() {},
  });
}
