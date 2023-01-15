import { E } from '@endo/eventual-send';
import { assert, Fail } from '@agoric/assert';
import { keyEQ } from '@agoric/store';
import { Far } from '@endo/far';
import { showPurseBalance, setupIssuers } from './helpers.js';

import { makePrintLog } from './printLog.js';

const build = async (log, zoe, issuers, payments, installations) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [_moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  let secondPriceAuctionSeatP;

  return Far('carolstuff', {
    doSecondPriceAuctionBid: async invitationP => {
      const invitation = await E(invitationIssuer).claim(invitationP);
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      const { value: invitationValue } = await E(invitationIssuer).getAmountOf(
        invitation,
      );
      installation === installations.secondPriceAuction ||
        Fail`wrong installation`;
      keyEQ(
        harden({ Asset: moolaIssuer, Ask: simoleanIssuer }),
        issuerKeywordRecord,
      ) || Fail`issuerKeywordRecord were not as expected`;
      assert(keyEQ(invitationValue[0].minimumBid, simoleans(3)));
      assert(keyEQ(invitationValue[0].auctionedAssets, moola(1)));

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(7) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      secondPriceAuctionSeatP = await E(zoe).offer(
        invitation,
        proposal,
        paymentKeywordRecord,
      );
      log(`Carol: ${await E(secondPriceAuctionSeatP).getOfferResult()}`);
    },
    doSecondPriceAuctionGetPayout: async () => {
      const moolaPayout = await E(secondPriceAuctionSeatP).getPayout('Asset');
      const simoleanPayout = await E(secondPriceAuctionSeatP).getPayout('Bid');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'carolMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'carolSimoleanPurse', log);
    },
  });
};

export function buildRootObject() {
  return Far('root', {
    build: (...args) => build(makePrintLog(), ...args),
  });
}
