import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from './helpers';
import { makePrintLog } from './printLog';

const build = async (E, log, zoe, issuers, payments, installations) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [_moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await E(inviteIssuer).claim(inviteP);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        invite,
      );

      const { installationHandle, terms, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Bid: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord were not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteExtent[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent[0].auctionedAssets, moola(1)));

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

const setup = (syscall, state, helpers) =>
  helpers.makeLiveSlots(syscall, state, E =>
    harden({
      build: (...args) => build(E, makePrintLog(helpers.log), ...args),
    }),
  );
export default harden(setup);
