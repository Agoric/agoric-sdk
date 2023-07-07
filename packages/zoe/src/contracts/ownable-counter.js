import { M } from '@endo/patterns';
import { prepareExoClassKit } from '@agoric/vat-data';
import { prepareOwnable } from '../contractSupport/prepare-ownable.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {ZCF} zcf
 * @param {{ count: bigint}} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { count: startCount = 0n } = privateArgs;
  assert.typeof(startCount, 'bigint');

  const makeUnderlyingCounterKit = prepareExoClassKit(
    baggage,
    'OwnableCounter',
    {
      counter: M.interface('Counter', {
        incr: M.call().returns(M.bigint()),
        // required by makePrepareOwnableClass
        getCustomDetails: M.call().returns(
          harden({
            count: M.bigint(),
          }),
        ),
      }),
      viewer: M.interface('ViewCounter', {
        view: M.call().returns(M.bigint()),
      }),
    },
    count => ({
      count,
    }),
    {
      counter: {
        incr() {
          const { state } = this;
          state.count += 1n;
          return state.count;
        },
        getCustomDetails() {
          const {
            state: { count },
          } = this;
          return harden({
            count,
          });
        },
      },
      viewer: {
        view() {
          const {
            state: { count },
          } = this;
          return count;
        },
      },
    },
  );

  const makeOwnableCounter = prepareOwnable(
    zcf,
    baggage,
    'Counter',
    'OwnableCounter',
    ['incr', 'getCustomDetails'],
  );

  const { counter: underlyingCounter, viewer } =
    makeUnderlyingCounterKit(startCount);

  const ownableCounter = makeOwnableCounter(underlyingCounter);

  return harden({
    creatorFacet: ownableCounter,
    publicFacet: viewer,
  });
};
harden(start);
