/* global makeKind */
import { Far } from '@agoric/marshal';

function makeBogusInstance(_state) {
  return {
    init() {},
    self: Far('bogus', {}),
  };
}
const bogusMaker = makeKind(makeBogusInstance);

for (let i = 1; i <= 5; i += 1) {
  bogusMaker();
}

export function buildRootObject() {
  return Far('root', {});
}
