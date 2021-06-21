// @ts-check

import { Far } from '@agoric/marshal';

import '../../../exported';

/**
 * This contract tests Zoe handling contract failures.
 *
 * This contract throws exceptions in various
 * situations. We want to see that each is handled correctly.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const terms = zcf.getTerms();
  let offersCount = 0n;

  if (terms.throw) {
    throw new Error('blowup in makeContract');
  }

  const throwing = () => {
    offersCount += 1n;
    throw new Error('someException');
  };
  const makeThrowingInvitation = () =>
    zcf.makeInvitation(throwing, 'getRefund');

  const giveRefund = seat => {
    offersCount += 1n;
    seat.exit();
  };

  const zcfShutdown = completion => zcf.shutdown(completion);
  const zcfShutdownWithFailure = reason => zcf.shutdownWithFailure(reason);

  const makeInvitation = () => zcf.makeInvitation(giveRefund, 'Refund');

  offersCount += 1n;
  const publicFacet = Far('publicFacet', {
    getOffersCount: () => {
      offersCount += 1n;
      return offersCount;
    },
    makeInvitation,
    makeThrowingInvitation,
    zcfShutdown,
    zcfShutdownWithFailure,
    throwSomething: () => {
      offersCount += 1n;
      throw new Error('someException');
    },
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
