import { M } from '@endo/patterns';
import { prepareExoClassKit } from '@agoric/vat-data';
import { prepareOwnable } from '../../../src/contractSupport/prepare-ownable.js';

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
        getInvitationCustomDetails: M.call().returns(
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
        getInvitationCustomDetails() {
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
    baggage,
    (...args) => zcf.makeInvitation(...args),
    'Counter',
    'OwnableCounter',
    ['incr', 'getInvitationCustomDetails'],
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
