import { Far } from '@endo/marshal';
import {
  makeKindHandle,
  defineDurableKind,
  makeScalarBigMapStore,
} from '@agoric/vat-data';

export function buildRootObject() {
  return Far('root', {
    bootstrap() {},

    testStore() {
      makeScalarBigMapStore('dfstore', { fakeDurable: true });
    },

    testObj() {
      const kh = makeKindHandle('kh');
      defineDurableKind(kh, () => ({}), {}, { fakeDurable: true });
    },
  });
}
