import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { defineKind, makeScalarBigWeakMapStore } from '@agoric/vat-data';

const p = console.log;

function build(name) {
  const makeThing = defineKind(
    'thing',
    (label, companion, companionName) => {
      p(`${name}'s thing ${label}: initialize ${companionName}`);
      return { label, companion, companionName, count: 0 };
    },
    {
      echo({ state }, message) {
        state.count += 1;
        E(state.companion).say(message);
      },
      async changePartner({ state }, newCompanion) {
        state.count += 1;
        state.companion = newCompanion;
        const companionName = await E(newCompanion).getName();
        state.companionName = companionName;
        p(`${name}'s thing ${state.label}: changePartner ${companionName}`);
      },
      getLabel({ state }) {
        const label = state.label;
        p(`${name}'s thing ${label}: getLabel`);
        state.count += 1;
        return label;
      },
      report({ state }) {
        p(`${name}'s thing ${state.label} invoked ${state.count} times`);
      },
    },
  );
  let nextThingNumber = 0;

  let myThings;

  function ensureCollection() {
    if (!myThings) {
      myThings = makeScalarBigWeakMapStore('things');
    }
  }

  return Far('root', {
    async introduce(other) {
      const otherName = await E(other).getName();
      const thing = makeThing(`thing-${nextThingNumber}`, other, otherName);
      nextThingNumber += 1;
      ensureCollection();
      myThings.init(thing, 0);
      return thing;
    },
    doYouHave(thing) {
      ensureCollection();
      if (myThings.has(thing)) {
        const queryCount = myThings.get(thing) + 1;
        myThings.set(thing, queryCount);
        p(`${name}: ${queryCount} queries about ${thing.getLabel()}`);
        return true;
      } else {
        p(`${name}: query about unknown thing`);
        return false;
      }
    },
  });
}

export function buildRootObject(_vatPowers, vatParameters) {
  return build(vatParameters.name);
}
