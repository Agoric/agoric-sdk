import { Far, E } from '@endo/far';
import { defineKind } from '@agoric/vat-data';

const things = [];

export function buildRootObject() {
  const makeThing = defineKind('thing', label => ({ label }), {
    getLabel: ({ state }) => state.label,
  });
  let nextThingNumber = 0;

  return Far('root', {
    prepare() {
      things.push(null);
      for (let i = 1; i <= 9; i += 1) {
        things.push(makeThing(`thing #${i}`));
      }
    },
    getThing(forWhom) {
      let thing;
      do {
        thing = things[nextThingNumber];
        nextThingNumber += 1;
      } while (!thing);

      if (nextThingNumber === 3) {
        thing.getLabel();
        things[4].getLabel();
        things[4] = null; // arbitrarily drop one before sending it, but don't drop the one we're sending
      } else {
        thing.getLabel();
        things[nextThingNumber - 1] = null; // drop the one we're sending
      }
      E(forWhom).deliverThing(thing);
      thing = null;
    },
    finish() {
      while (nextThingNumber < 8) {
        const deadThing = things[nextThingNumber];
        if (deadThing) {
          deadThing.getLabel();
          things[nextThingNumber] = null;
        }
        nextThingNumber += 1;
      }
      console.log(`Bob finishing`);
    },
  });
}
