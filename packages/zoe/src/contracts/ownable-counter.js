import { M } from '@endo/patterns';
import { prepareExo, prepareExoClass } from '@agoric/vat-data';
import { makeOwnableKit } from '../contractSupport/ownableKit.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const CounterDetailsShape = harden({
  count: M.bigint(),
});

/**
 * @param {ZCF} zcf
 * @param {{ count: bigint}} privateArgs
 * @param {Baggage} instanceBaggage
 */
export const start = async (zcf, privateArgs, instanceBaggage) => {
  const { count: startCount = 0n } = privateArgs;
  assert.typeof(startCount, 'bigint');

  // for use by upgraded versions.
  const firstTime = !instanceBaggage.has('count');
  if (firstTime) {
    instanceBaggage.init('count', startCount);
  }

  const makeForwardOwnableCounter = customDetails =>
    // eslint-disable-next-line no-use-before-define
    makeOwnableCounter(customDetails);

  const {
    OwnableObjectMethodGuards,
    ownableObjectMethods,
    ownableObjectOptions,
  } = makeOwnableKit(
    zcf,
    instanceBaggage,
    CounterDetailsShape,
    makeForwardOwnableCounter,
  );

  const OwnableCounterI = M.interface('OwnableCounter', {
    ...OwnableObjectMethodGuards,
    incr: M.call().returns(M.bigint()),
  });

  const makeOwnableCounter = prepareExoClass(
    instanceBaggage,
    'OwnableCounter',
    OwnableCounterI,
    customDetails => {
      const { count } = customDetails;
      assert(count === instanceBaggage.get('count'));
      return harden({});
    },
    {
      ...ownableObjectMethods,

      incr() {
        const count = instanceBaggage.get('count') + 1n;
        instanceBaggage.set('count', count);
        return count;
      },

      // note: abstract method must be concretely implemented
      getCustomDetails() {
        return harden({
          count: instanceBaggage.get('count'),
        });
      },
    },

    {
      ...ownableObjectOptions,
    },
  );

  const ViewCounterI = M.interface('ViewCounter', {
    view: M.call().returns(M.bigint()),
  });

  const viewCounter = prepareExo(instanceBaggage, 'ViewCounter', ViewCounterI, {
    view() {
      return instanceBaggage.get('count');
    },
  });

  return harden({
    creatorFacet: makeOwnableCounter(startCount),
    publicFacet: viewCounter,
  });
};
harden(start);
