// @ts-check

import { makeZoeHelpers } from '../../../src/contractSupport';

/**
 * This is an atomic swap contract to test Zoe handling contract failures.
 *
 * This contract exceeds metering limits or throws exceptions in various
 * situations. We want to see that each is handled correctly.
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { swap, assertKeywords, checkHook } = makeZoeHelpers(zcf);

  let offersCount = 0;

  assertKeywords(harden(['Asset', 'Price']));

  const { terms } = zcf.getInstanceRecord();
  if (terms.throw) {
    throw new Error('blowup in makeContract');
  } else if (terms.meter) {
    return new Array(1e9);
  }

  const safeAutoRefundHook = offerHandle => {
    offersCount += 1;
    zcf.complete(harden([offerHandle]));
    return `The offer was accepted`;
  };
  const makeSafeInvite = () =>
    zcf.makeInvitation(safeAutoRefundHook, 'getRefund');

  const meterExceededHook = () => {
    offersCount += 1;
    return new Array(1e9);
  };
  const makeExcessiveInvite = () =>
    zcf.makeInvitation(meterExceededHook, 'getRefund');

  const throwingHook = () => {
    offersCount += 1;
    throw new Error('someException');
  };
  const makeThrowingInvite = () =>
    zcf.makeInvitation(throwingHook, 'getRefund');

  const swapOfferExpected = harden({
    give: { Asset: null },
    want: { Price: null },
  });

  const makeMatchingInvite = firstOfferHandle => {
    offersCount += 1;
    const {
      proposal: { want, give },
    } = zcf.getOffer(firstOfferHandle);

    return zcf.makeInvitation(
      offerHandle => swap(firstOfferHandle, offerHandle),
      'matchOffer',
      harden({
        customProperties: {
          asset: give.Asset,
          price: want.Price,
        },
      }),
    );
  };

  const makeSwapInvite = () =>
    zcf.makeInvitation(
      checkHook(makeMatchingInvite, swapOfferExpected),
      'firstOffer',
    );

  offersCount += 1;
  zcf.initPublicAPI(
    harden({
      getOffersCount: () => {
        offersCount += 1;
        return offersCount;
      },
      makeSafeInvite,
      makeSwapInvite,
      makeExcessiveInvite,
      makeThrowingInvite,
      meterException: () => {
        offersCount += 1;
        return new Array(1e9);
      },
      throwSomething: () => {
        offersCount += 1;
        throw new Error('someException');
      },
    }),
  );

  return makeSafeInvite();
};

harden(makeContract);
export { makeContract };
