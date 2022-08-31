import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { assert } from '@agoric/assert';
import { initEmpty } from '@agoric/store';
import { defineDurableKind, defineDurableKindMulti } from '@agoric/vat-data';

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
  let counter = 20;

  if (vatParameters?.handler) {
    E(vatParameters.handler).ping('hello from v2');
  }

  if (vatParameters?.explode) {
    throw Error(vatParameters.explode);
  }

  if (baggage.has('mkh')) {
    const mkh = baggage.get('mkh');
    if (vatParameters.mode === 'm2sFacetiousnessMismatch') {
      defineDurableKind(mkh, initEmpty, {
        fooMethod: () => 2,
      });
    } else {
      defineDurableKindMulti(mkh, initEmpty, {
        bar: {
          barMethod: () => 2,
        },
        foo: {
          fooMethod: () => 2,
        },
        baz: {
          bazMethod: () => 2,
        },
      });
    }
  }

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
    pingback: handler => {
      counter += 1;
      return E(handler).ping(`ping ${counter}`);
    },
    getNewDurandal: () => newDur,
  });
  // buildRootObject() is allowed to return a Promise, as long as it fulfills
  // promptly (we added this in #5246 to allow ZCF to use the async
  // importBundle() during contract upgrade).  We return a pre-fulfilled Promise
  // here to exercise this ability.
  return Promise.resolve(root);
};
