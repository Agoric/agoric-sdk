import { Far } from '@endo/far';
import { defineKind } from '@agoric/vat-data';

const makeThing = defineKind(
  'thing',
  name => {
    return { name };
  },
  {
    getName: ({ state }) => state.name,
    rename: ({ state }, newName) => {
      state.name = newName;
    },
  },
);

export function buildRootObject() {
  let heldThing;

  return Far('root', {
    makeThing(name, hold) {
      const thing = makeThing(name);
      if (hold) {
        heldThing = thing;
      }
      return thing;
    },
    readThing(what) {
      return what.getName();
    },
    readHeldThing() {
      if (heldThing) {
        return heldThing.getName();
      } else {
        throw Error('no held thing');
      }
    },
    writeThing(what, newName) {
      what.rename(newName);
    },
    writeHeldThing(newName) {
      if (heldThing) {
        heldThing.rename(newName);
      } else {
        throw Error('no held thing');
      }
    },
    holdThing(what) {
      heldThing = what;
    },
    forgetHeldThing() {
      heldThing = null;
    },
  });
}
