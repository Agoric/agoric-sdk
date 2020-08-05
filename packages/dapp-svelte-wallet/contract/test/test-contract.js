import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';
import { evalContractBundle } from '@agoric/zoe/src/evalContractCode';

import { makeZoe } from '@agoric/zoe';
import makeIssuerKit from '@agoric/ertp';

const contractPath = `${__dirname}/../src/contract`;

function makeFakeVatAdmin() {
  return harden({
    createVat: bundle => {
      return harden({
        root: E(evalContractBundle(bundle)).buildRootObject(),
      });
    },
  });
}

test('contract with valid offers', async t => {
  t.plan(10);
  try {
    // Outside of tests, we should use the long-lived Zoe on the
    // testnet. In this test, we must create a new Zoe.
    const zoe = makeZoe(makeFakeVatAdmin());

    // Get the Zoe invite issuer from Zoe.
    const inviteIssuer = await E(zoe).getInviteIssuer();

    // Pack the contract.
    const contractBundle = await bundleSource(contractPath);

    // Install the contract on Zoe, getting an installationHandle (an
    // opaque identifier). We can use this installationHandle to look
    // up the code we installed. Outside of tests, we can also send the
    // installationHandle to someone else, and they can use it to
    // create a new contract instance using the same code.
    const installationHandle = await E(zoe).install(contractBundle);

    // Let's check the code. Outside of this test, we would probably
    // want to check more extensively,
    const installedBundle = await E(zoe).getInstallation(installationHandle);
    const code = installedBundle.source;
    t.ok(
      code.includes(`This contract provides encouragement. `),
      `the code installed passes a quick check of what we intended to install`,
    );

    // Make some mints/issuers just for our test.
    const {
      issuer: bucksIssuer,
      mint: bucksMint,
      amountMath: bucksAmountMath,
    } = makeIssuerKit('bucks');

    // Let's give ourselves 5 bucks to start
    const bucks5 = bucksAmountMath.make(5);
    const bucksPayment = bucksMint.mintPayment(bucks5);

    // Create the contract instance, using our new issuer. It returns
    // an invite, which we will use when we call offer(), and the
    // instanceRecord, which contains the publicAPI, among other things.
    const {
      invite: adminInvite,
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle, {
      Tip: bucksIssuer,
    });

    // Check that we received an invite as the result of making the
    // contract instance.
    t.ok(
      await E(inviteIssuer).isLive(adminInvite),
      `an valid invite (an ERTP payment) was created`,
    );

    // Let's use the adminInvite to make an offer. This will allow us
    // to remove our tips at the end
    const {
      payout: adminPayoutP,
      outcome: adminOutcomeP,
      completeObj: { complete: completeAdmin },
    } = await E(zoe).offer(adminInvite);

    t.equals(
      await adminOutcomeP,
      `admin invite redeemed`,
      `admin outcome is correct`,
    );

    // Let's test some of the publicAPI methods. The publicAPI is
    // accessible to anyone who has access to Zoe and the
    // instanceHandle. The publicAPI methods are up to the contract,
    // and Zoe doesn't require contracts to have
    // publicAPI methods. In this case, the contract provides a
    // getNotifier() function that returns a notifier we can subscribe
    // to, in order to get updates about changes to the state of the
    // contract.
    const notifier = E(publicAPI).getNotifier();
    const { value, updateCount } = await E(notifier).getUpdateSince();
    const nextUpdateP = E(notifier).getUpdateSince(updateCount);

    // Count starts at 0
    t.equals(value.count, 0, `count starts at 0`);

    t.deepEquals(
      value.messages,
      harden({
        basic: `You're doing great!`,
        premium: `Wow, just wow. I have never seen such talent!`,
      }),
      `messages are as expected`,
    );

    // Let's use the contract like a client and get some encouragement!
    const encouragementInvite = await E(publicAPI).makeInvite();

    const { outcome: encouragementP } = await E(zoe).offer(encouragementInvite);

    t.equals(
      await encouragementP,
      `You're doing great!`,
      `encouragement matches expected`,
    );

    // Getting encouragement resolves the 'nextUpdateP' promise
    nextUpdateP.then(async result => {
      t.equals(result.value.count, 1, 'count increments by 1');

      // Now, let's get a premium encouragement message
      const encouragementInvite2 = await E(publicAPI).makeInvite();
      const proposal = harden({ give: { Tip: bucks5 } });
      const paymentKeywordRecord = harden({
        Tip: bucksPayment,
      });
      const { outcome: secondEncouragementP } = await E(zoe).offer(
        encouragementInvite2,
        proposal,
        paymentKeywordRecord,
      );

      t.equals(
        await secondEncouragementP,
        `Wow, just wow. I have never seen such talent!`,
        `premium message is as expected`,
      );

      const newResult = await E(notifier).getUpdateSince();
      t.deepEquals(newResult.value.count, 2, `count is now 2`);

      // Let's get our Tips
      completeAdmin();
      Promise.resolve(E.G(adminPayoutP).Tip).then(tip => {
        bucksIssuer.getAmountOf(tip).then(tipAmount => {
          t.deepEquals(tipAmount, bucks5, `payout is 5 bucks, all the tips`);
        });
      });
    });
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});
