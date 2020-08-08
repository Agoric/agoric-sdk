import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from '../helpers';

const build = async (log, zoe, issuers, payments, installations) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [_moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInvitationIssuer();

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await E(inviteIssuer).claim(inviteP);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(invite);

      const { installationHandle, terms, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteValue[0].instanceHandle);
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Ask: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord were not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteValue[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteValue[0].auctionedAssets, moola(1)));

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(7) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        invite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

      const carolResult = await payoutP;
      const moolaPayout = await carolResult.Asset;
      const simoleanPayout = await carolResult.Bid;

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'carolMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'carolSimoleanPurse', log);
    },
  });
};

export function buildRootObject(vatPowers) {
  return harden({
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
