import { Far } from '@endo/marshal';
import { assert } from '@agoric/assert';
import { defineDurableKind } from '@agoric/vat-data';

const initialize = (name, imp, value) => {
  return harden({ name, imp, value });
};

const behavior = {
  get: ({ state }) => ({ new: 'new', ...state.value }),
  getImport: ({ state }) => state.imp,
  set: ({ state }, value) => {
    state.value = value;
  },
};

export const buildRootObject = (_vatPowers, vatParameters, baggage) => {
  const durandalHandle = baggage.get('durandalHandle');
  const makeDurandal = defineDurableKind(durandalHandle, initialize, behavior);
  // note: to test #5725, newDur must be the first new Durandal
  // instance in this version of the vat
  const newDur = makeDurandal('dur-new', undefined, { name: 'd1' });

  const root = Far('root', {
    getVersion: () => 'v2',
    getParameters: () => vatParameters,
    getPresence: () => baggage.get('presence'),
    getData: () => baggage.get('data'),
    getEntries: collection => Array.from(collection.entries()),
    checkBaggage: (imp32, imp36) => {
      // console.log(`baggage:`, Array.from(baggage.keys()));
      const dc5 = baggage.get('dc5');
      const dc6 = baggage.get('dc6');
      const imp33 = dc5.get(imp32).getImport();
      let dur34;
      for (const key of dc6.keys()) {
        if (key !== imp36) {
          dur34 = key;
        }
      }
      const imp35 = dc6.get(dur34).getImport();
      assert.equal(imp36, dc6.get(imp36).getImport());
      const imp37 = baggage.get('dur37').getImport();
      const imp38 = baggage.get('imp38');
      return { imp33, imp35, imp37, imp38 };
    },
    getNewDurandal: () => newDur,
  });
  // exercise async return
  return Promise.resolve(root);
};
