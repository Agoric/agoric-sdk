import { M } from '@endo/patterns';
import { prepareExo } from '@agoric/vat-data';
import { makePrepareOwnableClass } from '../contractSupport/prepare-ownable-object.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const CounterI = M.interface('Counter', {
  incr: M.call().returns(M.bigint()),
});

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

  const prepareOwnableClass = makePrepareOwnableClass(zcf);

  const makeOwnableCounter = prepareOwnableClass(
    instanceBaggage,
    'OwnableCounter',
    CounterI,
    customDetails => {
      // @ts-expect-error TODO type the counter's `customDetails`
      const { count } = customDetails;
      assert(count === instanceBaggage.get('count'));
      return harden({});
    },
    {
      incr() {
        const count = instanceBaggage.get('count') + 1n;
        instanceBaggage.set('count', count);
        return count;
      },

      // note: abstract method must be concretely implemented by
      // ownable objects
      getCustomDetails() {
        return harden({
          count: instanceBaggage.get('count'),
        });
      },
    },
    {
      detailsShape: CounterDetailsShape,
    },
  );

  const viewCounter = prepareExo(
    instanceBaggage,
    'ViewCounter',
    M.interface('ViewCounter', {
      view: M.call().returns(M.bigint()),
    }),
    {
      view() {
        return instanceBaggage.get('count');
      },
    },
  );

  return harden({
    creatorFacet: makeOwnableCounter(
      harden({
        count: startCount,
      }),
    ),
    publicFacet: viewCounter,
  });
};
harden(start);
