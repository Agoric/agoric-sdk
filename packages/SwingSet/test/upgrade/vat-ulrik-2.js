/* global VatData */
import { Far } from '@endo/marshal';
// import { defineDurableKind } from '@agoric/vat-data';
const { defineDurableKind } = VatData;

function initializeDurandal(arg) {
  return { arg };
}

const durandalBehavior = {
  get({ state }) {
    return `new ${state.arg}`;
  },
  set({ state }, arg) {
    state.arg = arg;
  },
};

export function buildRootObject(_vatPowers, vatParameters, baggage) {
  const durandalHandle = baggage.get('durandalHandle');
  defineDurableKind(durandalHandle, initializeDurandal, durandalBehavior);

  return Far('root', {
    getVersion() {
      return 'v2';
    },
    getParameters() {
      return vatParameters;
    },
    getPresence() {
      return baggage.get('presence');
    },
    getData() {
      return baggage.get('data');
    },
  });
}
