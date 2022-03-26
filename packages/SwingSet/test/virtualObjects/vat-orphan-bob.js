import { Far } from '@endo/marshal';
import { defineKind } from '@agoric/vat-data';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  const makeThing = defineKind(
    'thing',
    () => ({ unused: 'uncared for' }),
    () => ({
      facetA: {
        methodA: () => 0,
      },
      facetB: {
        methodB: () => 0,
      },
    }),
  );

  let originalFacet;

  return Far('root', {
    getYourThing() {
      originalFacet = makeThing().facetA;
      makeThing();
      return originalFacet;
    },
    isThingYourThing(thing) {
      testLog(`compare originalFacet === thing : ${originalFacet === thing}`);
    },
  });
}
