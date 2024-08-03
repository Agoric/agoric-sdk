import { q, X } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import buildManualTimer from '../../../tools/manualTimer.js';

const mintInto = (kit, purse, value) =>
  E(kit.mint)
    .mintPayment(AmountMath.make(kit.brand, value))
    .then(p => E(purse).deposit(p));

const offerCall = async (zoe, creatorFacet, kits, timer, give, want) => {
  const { doubloonsKit, bucksKit } = kits;
  const ccMakerInvitation = await E(creatorFacet).makeInvitation();
  const giveAmount = AmountMath.make(doubloonsKit.brand, give);
  const wantAmount = AmountMath.make(bucksKit.brand, want);
  const payment = E(doubloonsKit.mint).mintPayment(giveAmount);
  return E(zoe).offer(
    ccMakerInvitation,
    harden({
      give: { Doubloons: giveAmount },
      want: { Bucks: wantAmount },
      exit: {
        afterDeadline: {
          deadline: 10n,
          timer,
        },
      },
    }),
    { Doubloons: payment },
  );
};

const acceptCall = async (zoe, invitation, kits, give, want) => {
  const { doubloonsKit, bucksKit } = kits;
  const giveAmount = AmountMath.make(bucksKit.brand, give);
  const wantAmount = AmountMath.make(doubloonsKit.brand, want);
  const payment = E(bucksKit.mint).mintPayment(giveAmount);
  return E(zoe).offer(
    invitation,
    harden({
      give: { Bucks: giveAmount },
      want: { Doubloons: wantAmount },
      exit: { onDemand: null },
    }),
    { Bucks: payment },
  );
};

const depositPayout = (seat, keyword, purse, expectedAmount) => {
  return E(seat)
    .getPayout(keyword)
    .then(payout => {
      return E(purse).deposit(payout);
    })
    .then(depositAmount => {
      AmountMath.isEqual(depositAmount, expectedAmount) ||
        assert.fail(
          X`amounts don't match: ${q(depositAmount)}, ${q(expectedAmount)}`,
        );
    });
};

export const buildRootObject = () => {
  let vatAdmin;
  let zoe;
  let instanceAdmin2;
  let ertpService;
  let doubloonsKit;
  let bucksKit;
  let invitation2B;
  let creator2;
  let kits;
  let issuerRecord;
  let doubloons;
  let bucks;
  const timer = buildManualTimer(console.log);
  let installation;

  return Far('root', {
    bootstrap: async (vats, devices) => {
      await timer.tick('bootstrap');
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      [{ zoeService: zoe }, ertpService] = await Promise.all([
        E(vats.zoe).buildZoe(vatAdmin, undefined, 'zcf'),
        E(vats.ertp).getErtpService(),
      ]);

      doubloonsKit = await E(ertpService).makeIssuerKit('Doubloons');
      bucksKit = await E(ertpService).makeIssuerKit('Bucks');
      kits = { doubloonsKit, bucksKit };
      doubloons = v => AmountMath.make(doubloonsKit.brand, v);
      bucks = v => AmountMath.make(bucksKit.brand, v);

      const v2BundleId = await E(vatAdmin).getBundleIDByName('coveredCallV2');
      assert(v2BundleId, 'bundleId must not be empty');
      installation = await E(zoe).installBundleID(v2BundleId);

      issuerRecord = harden({
        Bucks: bucksKit.issuer,
        Doubloons: doubloonsKit.issuer,
      });
    },

    buildV1: async () => {
      console.log(`BOOT starting buildV1`);
      await timer.tick('buildV1');
      // build the contract vat from ZCF and the contract bundlecap

      const doubloonPurse = await E(doubloonsKit.issuer).makeEmptyPurse();
      const bucksPurse = await E(bucksKit.issuer).makeEmptyPurse();
      await mintInto(doubloonsKit, doubloonPurse, 20n);

      // Complete round-trip without upgrade
      const facets1 = await E(zoe).startInstance(installation, issuerRecord);
      const creator1 = facets1.creatorFacet;
      const seat1A = await offerCall(zoe, creator1, kits, timer, 15n, 30n);
      const invitation1B = await E(seat1A).getOfferResult();
      const seat1B = await acceptCall(zoe, invitation1B, kits, 30n, 15n);
      const doubloonsPurse = E(doubloonsKit.issuer).makeEmptyPurse();
      const offerResult1B = await E(seat1B).getOfferResult();
      assert.equal(
        offerResult1B,
        'The option was exercised. Please collect the assets in your payout.',
      );
      await depositPayout(seat1A, 'Bucks', bucksPurse, bucks(30n));
      await depositPayout(seat1A, 'Doubloons', doubloonPurse, doubloons(0n));
      await depositPayout(seat1B, 'Bucks', bucksPurse, bucks(0n));
      await depositPayout(seat1B, 'Doubloons', doubloonsPurse, doubloons(15n));

      // Create the call, and hand off the invitation for exercise after upgrade
      const facets2 = await E(zoe).startInstance(installation, issuerRecord);
      ({ adminFacet: instanceAdmin2 } = facets2);
      creator2 = facets2.creatorFacet;
      const seat2A = await offerCall(zoe, creator2, kits, timer, 22n, 42n);
      const invitation2BP = E(seat2A).getOfferResult();

      E(seat2A)
        .getOfferResult()
        .then(async _invitation => {
          await depositPayout(seat2A, 'Bucks', bucksPurse, bucks(42n));
          await depositPayout(
            seat2A,
            'Doubloons',
            doubloonPurse,
            doubloons(0n),
          );
        });

      invitation2B = await invitation2BP;
      return true;
    },

    upgradeV2: async () => {
      await timer.tick('upgradeV2');
      const v3BundleId = await E(vatAdmin).getBundleIDByName('coveredCallV3');
      const bucksPurse = await E(bucksKit.issuer).makeEmptyPurse();
      const doubloonsPurse = await E(doubloonsKit.issuer).makeEmptyPurse();

      const upgradeResult = await E(instanceAdmin2).upgradeContract(v3BundleId);
      assert.equal(upgradeResult.incarnationNumber, 1);
      console.log('Boot  starting upgrade V2');

      // exercise an invitation from before the upgrade
      const seat2BP = acceptCall(zoe, invitation2B, kits, 42n, 22n);
      seat2BP.then(
        seat => console.log(`Boot   upgrade  seat2b  ${seat}`),
        e => console.log(` BOOT  upgrade  seat2b fail:  ${e}`),
      );
      const seat2B = await seat2BP;

      const offerResult2B = await E(seat2B).getOfferResult();
      assert.equal(
        offerResult2B,
        'The V3 upgraded option was exercised. Please collect the assets in your payout.',
      );

      // Complete round-trip with post-upgraded instance
      console.log('Boot  starting post-upgrade contract');
      const installationV3 = await E(zoe).installBundleID(v3BundleId);
      const facets3 = await E(zoe).startInstance(installationV3, issuerRecord);
      const creator3 = facets3.creatorFacet;
      const seat3A = await offerCall(zoe, creator3, kits, timer, 15n, 30n);
      const invitation3B = await E(seat3A).getOfferResult();
      const seat3B = await acceptCall(zoe, invitation3B, kits, 30n, 15n);
      const offerResult3B = await E(seat3B).getOfferResult();
      assert.equal(
        offerResult3B,
        'The V3 option was exercised. Please collect the assets in your payout.',
      );
      await depositPayout(seat3A, 'Bucks', bucksPurse, bucks(30n));
      await depositPayout(seat3A, 'Doubloons', doubloonsPurse, doubloons(0n));
      await depositPayout(seat3B, 'Bucks', bucksPurse, bucks(0n));
      await depositPayout(seat3B, 'Doubloons', doubloonsPurse, doubloons(15n));
      await depositPayout(seat2B, 'Doubloons', doubloonsPurse, doubloons(22n));

      console.log('Boot finished test');
      return true;
    },
  });
};
