import { Far } from '@endo/far';
import { makeReflectionMethods } from './vat-puppet.js';

export function buildRootObject(vatPowers, _vatParameters, baggage) {
  const methods = makeReflectionMethods(vatPowers, baggage);
  return Far('root', {
    ...methods,

    getVersion: () => 2,
  });
}
