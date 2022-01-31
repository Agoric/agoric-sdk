/* global makeKind */
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  function makeThingInstance(state) {
    return {
      init(label) {
        state.label = label;
      },
      self: Far('thing', {
        getLabel() {
          return state.label;
        },
      }),
    };
  }

  function makeVirtualHolderInstance(state) {
    return {
      init(value) {
        state.value = value;
      },
      self: Far('holder', {
        getValue() {
          return state.value;
        },
      }),
    };
  }

  const thingMaker = makeKind(makeThingInstance);
  const virtualHolderMaker = makeKind(makeVirtualHolderInstance);
  const cacheDisplacer = thingMaker('cacheDisplacer');
  let nextThingNumber = 0;
  let heldThing = null;
  let virtualHolder = null;

  function displaceCache() {
    return cacheDisplacer.getLabel();
  }

  function makeNextThing() {
    const thing = thingMaker(`thing #${nextThingNumber}`);
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
      virtualHolder = virtualHolderMaker(heldThing);
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
