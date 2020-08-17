// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  assertIssuerKeywords,
  assertProposalKeywords,
} from '../../../src/contractSupport';

/**
 * @type {ContractStartFn}
 */
const start = zcf => {
  assertIssuerKeywords(zcf, harden(['Asset', 'Price']));

  const makeAccompliceInvitation = malSeat => {
    const { want: wantProposal } = malSeat.getProposal();

    return zcf.makeInvitation(
      vicSeat => {
        const malAlloc = malSeat.getCurrentAllocation();
        const malSeatStaging = malSeat.stage(wantProposal);
        const vicSeatStaging = vicSeat.stage(malAlloc);
        zcf.reallocate(malSeatStaging, vicSeatStaging);
        malSeat.exit();
        vicSeat.exit();
      },
      'tantalizing offer',
      harden({
        customProperties: {
          Price: wantProposal.Price,
        },
      }),
    );
  };

  const firstOfferExpected = harden({
    want: { Price: null },
  });

  const creatorInvitation = zcf.makeInvitation(
    assertProposalKeywords(makeAccompliceInvitation, firstOfferExpected),
    'firstOffer',
  );

  return harden({ creatorInvitation });
};

harden(start);
export { start };
