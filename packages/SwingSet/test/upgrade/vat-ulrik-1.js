/* global VatData */
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
// import { makeKindHandle, defineDurableKind } from '@agoric/vat-data';
const { makeKindHandle, defineDurableKind } = VatData;

const durandalHandle = makeKindHandle('durandal');
function initializeDurandal(arg) {
  return { arg };
}

const durandalBehavior = {
  get({ state }) {
    return state.arg;
  },
  set({ state }, arg) {
    state.arg = arg;
  },
};

const makeDurandal = defineDurableKind(
  durandalHandle,
  initializeDurandal,
  durandalBehavior,
);

export function buildRootObject(_vatPowers, vatParameters, baggage) {
  const { promise: p1 } = makePromiseKit();
  const { promise: p2 } = makePromiseKit();
  let heldPromise;

  baggage.init('data', harden(['some', 'data']));
  baggage.init('durandalHandle', durandalHandle);

  return Far('root', {
    getVersion() {
      return 'v1';
    },
    getParameters() {
      return vatParameters;
    },

    acceptPresence(pres) {
      baggage.init('presence', pres);
    },
    getPresence() {
      return baggage.get('presence');
    },
    getData() {
      return baggage.get('data');
    },
    getDurandal(arg) {
      return makeDurandal(arg);
    },

    acceptPromise(p) {
      // stopVat will reject the promises that we decide, but should
      // not touch the ones we don't decide, so we hold onto this
      // until upgrade, to probe for bugs in that loop
      heldPromise = p;
      heldPromise.catch(() => 'hush');
    },
    getEternalPromise() {
      return { p1 };
    },
    returnEternalPromise() {
      return p2;
    },

    makeLostKind() {
      makeKindHandle('unhandled', []);
    },
  });
}
