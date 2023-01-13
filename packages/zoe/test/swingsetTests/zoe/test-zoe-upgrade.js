/* eslint-disable no-await-in-loop */

import '@agoric/swingset-vat/tools/prepare-test-env.js';
import test from 'ava';
import { buildVatController } from '@agoric/swingset-vat';
import { kunser } from '@agoric/swingset-vat/src/lib/kmarshal.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test('zoe vat upgrade trauma', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType:
      /** @type {import('@agoric/swingset-vat/src/types-external.js').ManagerType} */ (
        'xs-worker'
      ), // 'local',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../../../../SwingSet/test/bootstrap-relay.js'),
      },
      // TODO: Move vat-ertp-service.js up a level.
      ertp: { sourceSpec: bfile('../upgradeCoveredCall/vat-ertp-service.js') },
    },
    bundles: {
      zoe: { sourceSpec: bfile('./vat-zoe.js') },
      zcf: { sourceSpec: bfile('../../../src/contractFacet/vatRoot.js') },
      coveredCall: {
        sourceSpec: bfile('../../../src/contracts/coveredCall-durable.js'),
      },
    },
  };
  const c = await buildVatController(config);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    if (status === 'fulfilled') {
      const result = c.kpResolution(kpid);
      return kunser(result);
    }
    assert(status === 'rejected');
    const err = c.kpResolution(kpid);
    throw kunser(err);
  };
  const messageVat = (name, methodName, args) =>
    run('messageVat', [{ name, methodName, args }]);
  const messageObject = (presence, methodName, args) =>
    run('messageVatObject', [{ presence, methodName, args }]);

  /**
   * @see {@link ../upgradeCoveredCall/bootstrap-coveredCall-service-upgrade.js}
   */

  // Setup non-Zoe objects.
  const timer = await run('getTimer');
  const AmountMath = await messageVat('ertp', 'getAmountMath');
  const ertpService = await messageVat('ertp', 'getErtpService');
  const moolaKit = await messageObject(ertpService, 'makeIssuerKit', ['Moola']);
  const bucksKit = await messageObject(ertpService, 'makeIssuerKit', ['Bucks']);
  const moolaPurse = await messageObject(moolaKit.issuer, 'makeEmptyPurse');
  const bucksPurse = await messageObject(bucksKit.issuer, 'makeEmptyPurse');
  const noMoola = await messageObject(AmountMath, 'make', [moolaKit.brand, 0n]);
  const noBucks = await messageObject(AmountMath, 'make', [bucksKit.brand, 0n]);

  // Instantiate a Zoe vat and covered call installation.
  const zoeVatConfig = {
    name: 'zoe',
    bundleCapName: 'zoe',
  };
  await run('createVat', [zoeVatConfig]);
  const vatAdmin = await run('getVatAdmin');
  const zoe = await messageVat('zoe', 'buildZoe', [vatAdmin]);
  const coveredCallBundleId = await messageObject(
    vatAdmin,
    'getBundleIDByName',
    ['coveredCall'],
  );
  t.assert(coveredCallBundleId, 'contract bundleId must not be empty');
  const coveredCallInstallation = await messageObject(zoe, 'installBundleID', [
    coveredCallBundleId,
  ]);

  // Characterize the flow of instantiating and executing a contract
  // to completion.
  // Each step will be fed the output from its predecessor.
  const issuerRecord = harden({
    Bucks: bucksKit.issuer,
    Moola: moolaKit.issuer,
  });
  const moolaAmount = await messageObject(AmountMath, 'make', [
    moolaKit.brand,
    15n,
  ]);
  const bucksAmount = await messageObject(AmountMath, 'make', [
    bucksKit.brand,
    30n,
  ]);
  const flow = Object.entries({
    makeCoveredCallInstance: () =>
      messageObject(zoe, 'startInstance', [
        coveredCallInstallation,
        issuerRecord,
      ]),
    makeInvitation: async instance =>
      messageObject(instance.creatorFacet, 'makeInvitation'),
    makeOfferArgs: async invitation => {
      const proposal = harden({
        give: { Moola: moolaAmount },
        want: { Bucks: bucksAmount },
        exit: {
          afterDeadline: {
            deadline: 10n,
            timer,
          },
        },
      });
      const payment = await messageObject(moolaKit.mint, 'mintPayment', [
        moolaAmount,
      ]);
      return [invitation, proposal, { Moola: payment }];
    },
    offerCall: async offerArgs => {
      const offerSeat = await messageObject(zoe, 'offer', offerArgs);
      return { offerSeat };
    },
    acceptCall: async seats => {
      const acceptInvitation = await messageObject(
        seats.offerSeat,
        'getOfferResult',
      );
      const payment = await messageObject(bucksKit.mint, 'mintPayment', [
        bucksAmount,
      ]);
      const acceptSeat = await messageObject(zoe, 'offer', [
        acceptInvitation,
        harden({
          give: { Bucks: bucksAmount },
          want: { Moola: moolaAmount },
          exit: { onDemand: null },
        }),
        { Bucks: payment },
      ]);
      return { ...seats, acceptSeat };
    },
    finish: async seats => {
      const acceptResult = await messageObject(
        seats.acceptSeat,
        'getOfferResult',
      );
      const expectedResult =
        'The option was exercised. Please collect the assets in your payout.';
      t.is(acceptResult, expectedResult);
      const depositPayout = async (
        seatLabel,
        brandName,
        purse,
        expectedAmount,
      ) => {
        const payout = await messageObject(seats[seatLabel], 'getPayout', [
          brandName,
        ]);
        const depositAmount = await messageObject(purse, 'deposit', [payout]);
        const match = await messageObject(AmountMath, 'isEqual', [
          depositAmount,
          expectedAmount,
        ]);
        t.true(
          match,
          `${seatLabel} ${brandName} must be ${expectedAmount}, not ${depositAmount}`,
        );
      };
      await depositPayout('offerSeat', 'Bucks', bucksPurse, bucksAmount);
      await depositPayout('offerSeat', 'Moola', moolaPurse, noMoola);
      await depositPayout('acceptSeat', 'Bucks', bucksPurse, noBucks);
      await depositPayout('acceptSeat', 'Moola', moolaPurse, moolaAmount);
    },
  });
  const doSteps = async (label, steps, input = undefined) => {
    let result = input;
    for (const [stepName, fn] of steps) {
      await t.notThrowsAsync(async () => {
        result = await fn(result);
      }, `${label} ${stepName} must complete successfully`);
    }
    return result;
  };

  // Sanity check by running through the full flow with the initial Zoe.
  await doSteps('pre-upgrade', flow);

  // For each step, run to just before that point and pause for
  // continuation after upgrade.
  const pausedFlows = [];
  for (let i = 0; i < flow.length; i += 1) {
    const [beforeStepName] = flow[i];
    const result = await doSteps(`pre-${beforeStepName}`, flow.slice(0, i));
    pausedFlows.push({ result, remainingSteps: flow.slice(i) });
  }

  // Null-upgrade Zoe.
  const { incarnationNumber } = await run('upgradeVat', [zoeVatConfig]);
  t.is(incarnationNumber, 2, 'Zoe vat must be upgraded');

  // Verify a complete run in the new Zoe.
  await doSteps('post-upgrade', flow);

  // Verify completion of each paused flow.
  for (const { result, remainingSteps } of pausedFlows) {
    const [beforeStepName] = remainingSteps[0];
    await doSteps(`resumed-${beforeStepName}`, flow, result);
  }
});
