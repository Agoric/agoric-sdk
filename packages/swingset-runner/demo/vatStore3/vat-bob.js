/* global makeKind */
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

const things = [];

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

  const thingMaker = makeKind(makeThingInstance);
  let nextThingNumber = 0;

  return Far('root', {
    prepare() {
      for (let i = 1; i <= 9; i += 1) {
        things.push(thingMaker(`thing #${i}`));
      }
    },
    getThing(forWhom) {
      let thing;
      do {
        thing = things[nextThingNumber];
        nextThingNumber += 1;
      } while (!thing);

      if (nextThingNumber === 2) {
        console.log(`not nulling ${thing.getLabel()}`);
        console.log(`nulling ${things[3].getLabel()} instead`);
        things[3] = null; // arbitrarily drop one before sending it, but don't drop the one we're sending
      } else {
        console.log(`nulling ${thing.getLabel()}`);
        things[nextThingNumber - 1] = null; // drop the one we're sending
      }
      E(forWhom).deliverThing(thing);
      thing = null;
    },
    finish() {
      while (nextThingNumber < 7) {
        const deadThing = things[nextThingNumber];
        if (deadThing) {
          console.log(`final nulling ${deadThing.getLabel()}`);
          things[nextThingNumber] = null;
        }
        nextThingNumber += 1;
      }
      console.log(`Bob finishing`);
    },
  });
}
