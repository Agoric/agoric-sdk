import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { defineKind } from '@agoric/vat-data';

export function buildRootObject(_vatPowers) {
  const makeThing = defineKind(
    'thing',
    label => ({ label }),
    state => ({
      getLabel: () => state.label,
    }),
  );

  const makeVirtualHolder = defineKind(
    'holder',
    value => ({ value }),
    state => ({
      getValue: () => state.value,
    }),
  );

  const cacheDisplacer = makeThing('cacheDisplacer');
  let nextThingNumber = 0;
  let heldThing = null;
  let virtualHolder = null;

  function displaceCache() {
    return cacheDisplacer.getLabel();
  }

  function makeNextThing() {
    const thing = makeThing(`thing #${nextThingNumber}`);
    nextThingNumber += 1;
    return thing;
  }

  return Far('root', {
    makeAndHold() {
      heldThing = makeNextThing();
      displaceCache();
    },
    dropHeld() {
      heldThing = null;
      displaceCache();
    },
    storeHeld() {
      virtualHolder = makeVirtualHolder(heldThing);
      displaceCache();
    },
    fetchAndHold() {
      heldThing = virtualHolder.getValue();
      displaceCache();
    },
    exportHeld() {
      return heldThing;
    },
    importAndHold(thing) {
      heldThing = thing;
      displaceCache();
    },
    tellMeToContinueTest(other, testTag) {
      displaceCache();
      E(other).continueTest(testTag);
    },
    assess() {
      displaceCache();
      console.log('assess here');
    },
  });
}
