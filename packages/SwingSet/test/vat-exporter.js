import { Far } from '@endo/far';
import { M, defineExoClass } from '@agoric/store';
import {
  defineVirtualExoClass,
  prepareExoClass,
  provide,
} from '@agoric/vat-data';

export const buildRootObject = (_vatPowers, vatParameters, baggage) => {
  const { version } = vatParameters || {};

  // Define a family of analogous simple ephemeral/virtual/durable classes.
  const CounterI = M.interface('Counter', {
    increment: M.call().returns(M.number()),
  });
  const initCounterState = () => ({ value: 0 });
  const counterImpl = {
    increment() {
      const { state } = this;
      state.value += 1;
      return state.value;
    },
  };
  const makeEphemeralCounter = defineExoClass(
    'EphemeralCounter',
    CounterI,
    initCounterState,
    counterImpl,
  );
  const makeVirtualCounter = defineVirtualExoClass(
    'VirtualCounter',
    CounterI,
    initCounterState,
    counterImpl,
  );
  const makeDurableCounter = prepareExoClass(
    baggage,
    'DurableCounter',
    CounterI,
    initCounterState,
    counterImpl,
  );

  // Ensure an instance of each class, using baggage to preserve the
  // durable one across incarnations.
  const ephemeralCounter = makeEphemeralCounter();
  const virtualCounter = makeVirtualCounter();
  const durableCounter = provide(baggage, 'durableCounter', () =>
    makeDurableCounter(),
  );

  return Far('root', {
    getVersion: () => version,
    getParameters: () => vatParameters,
    getEphemeralCounter: () => ephemeralCounter,
    getVirtualCounter: () => virtualCounter,
    getDurableCounter: () => durableCounter,
  });
};
