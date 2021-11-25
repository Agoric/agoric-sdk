import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makeKind } from '@agoric/swingset-vat/src/storeModule.js';

export function buildRootObject(_vatPowers) {
  function makeThingInnards(state) {
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

  function makeVirtualHolderInnards(state) {
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

  const makeThing = makeKind(makeThingInnards);
  const makeVirtualHolder = makeKind(makeVirtualHolderInnards);
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
