// @ts-nocheck
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { assert } from '@endo/errors';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { TimeMath } from '@agoric/time';

import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';
import { makeZoeForTest } from '../../tools/setup-zoe.js';

import buildManualTimer from '../../tools/manualTimer.js';
import { setup } from './setupBasicMints.js';
import { assertPayoutAmount } from '../zoeTestHelpers.js';
import { makeScriptedOracle } from '../../tools/scriptedOracle.js';

// This test shows how to set up a fake oracle and use it in a contract.

const dirname = path.dirname(new URL(import.meta.url).pathname);

const oracleContractPath = `${dirname}/../../src/contracts/oracle.js`;
const bountyContractPath = `${dirname}/bounty.js`;

/**
 * @typedef {object} TestContext
 * @property {ZoeService} zoe
 * @property {Installation} oracleInstallation
 * @property {Installation} bountyInstallation
 * @property {Mint} moolaMint
 * @property {Issuer} moolaIssuer
 * @property {(value: AmountValue) => Amount} moola
 *
 * @typedef {import('ava').ExecutionContext<TestContext>} ExecutionContext
 */

test.before(
  'setup oracle',
  /** @param {ExecutionContext} ot */ async ot => {
    // Outside of tests, we should use the long-lived Zoe on the
    // testnet. In this test, we must create a new Zoe.
    const { admin, vatAdminState } = makeFakeVatAdmin();
    const zoe = makeZoeForTest(admin);

    const oracleContractBundle = await bundleSource(oracleContractPath);
    const bountyContractBundle = await bundleSource(bountyContractPath);

    // Install the contracts on Zoe, getting installations. We use these
    // installations to instantiate the contracts.
    vatAdminState.installBundle('b1-oracle', oracleContractBundle);
    const oracleInstallation = await E(zoe).installBundleID('b1-oracle');
    vatAdminState.installBundle('b1-bounty', bountyContractBundle);
    const bountyInstallation = await E(zoe).installBundleID('b1-bounty');
    const { moolaIssuer, moolaMint, moola } = setup();

    ot.context.zoe = zoe;
    ot.context.oracleInstallation = oracleInstallation;
    ot.context.bountyInstallation = bountyInstallation;
    ot.context.moolaMint = moolaMint;
    ot.context.moolaIssuer = moolaIssuer;
    ot.context.moola = moola;
  },
);

test.serial('pay bounty', async t => {
  const { zoe, oracleInstallation, bountyInstallation } = t.context;
  // The timer is not built in test.before(), because each test needs its own.
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const toTS = ts => TimeMath.coerceTimestampRecord(ts, timer.getTimerBrand());
  const { moolaIssuer, moolaMint, moola } = t.context;
  const script = { 0: 'Nothing', 1: 'Nothing', 2: 'Nothing', 3: 'Succeeded' };

  const oracle = await makeScriptedOracle(
    script,
    oracleInstallation,
    timer,
    zoe,
    t.context.moolaIssuer,
  );
  const { publicFacet } = oracle;

  const { creatorInvitation: funderInvitation } = await E(zoe).startInstance(
    bountyInstallation,
    { Bounty: moolaIssuer, Fee: moolaIssuer },
    {
      oracle: publicFacet,
      deadline: toTS(3n),
      condition: 'Succeeded',
      timer,
      fee: moola(50n),
    },
  );

  // Alice funds a bounty
  assert(funderInvitation);
  const funderSeat = await E(zoe).offer(
    funderInvitation,
    harden({
      give: { Bounty: moola(200n) },
      want: { Fee: moola(0n) },
    }),
    harden({
      Bounty: moolaMint.mintPayment(moola(200n)),
    }),
  );
  const bountyInvitation = await funderSeat.getOfferResult();
  const promise1 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Fee'),
    moola(50n),
    'funder Fee payout',
  );
  const promise2 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Bounty'),
    moola(0n),
    'funder Bounty payout',
  );

  // Bob buys the bounty invitation
  const bountySeat = await E(zoe).offer(
    bountyInvitation,
    harden({
      give: { Fee: moola(50n) },
      want: { Bounty: moola(0n) },
    }),
    harden({
      Fee: moolaMint.mintPayment(moola(50n)),
    }),
  );
  const promise3 = assertPayoutAmount(
    t,
    moolaIssuer,
    bountySeat.getPayout('Fee'),
    moola(0n),
    'beneficiary Fee payout',
  );
  const promise4 = assertPayoutAmount(
    t,
    moolaIssuer,
    bountySeat.getPayout('Bounty'),
    moola(200n),
    'beneficiary Bounty payout',
  );

  await E(timer).tickN(4);
  const results = await Promise.allSettled([
    promise1,
    promise2,
    promise3,
    promise4,
  ]);
  if (!results.every(result => result.status === 'fulfilled')) {
    t.log(results.map(result => result.value || result.reason));
    t.fail();
  }
});

test.serial('pay no bounty', async t => {
  const { zoe, oracleInstallation, bountyInstallation } = t.context;
  // The timer is not build in test.before(), because each test needs its own.
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const { moolaIssuer, moolaMint, moola } = t.context;
  const script = { 0: 'Nothing', 1: 'Nothing', 2: 'Nothing', 3: 'Nothing' };

  const oracle = await makeScriptedOracle(
    script,
    oracleInstallation,
    timer,
    zoe,
    t.context.moolaIssuer,
  );
  const { publicFacet } = oracle;

  const { creatorInvitation: funderInvitation } = await E(zoe).startInstance(
    bountyInstallation,
    { Bounty: moolaIssuer, Fee: moolaIssuer },
    {
      oracle: publicFacet,
      deadline: 3n,
      condition: 'Succeeded',
      timer,
      fee: moola(50n),
    },
  );

  // Alice funds a bounty
  assert(funderInvitation);
  const funderSeat = await E(zoe).offer(
    funderInvitation,
    harden({
      give: { Bounty: moola(200n) },
      want: { Fee: moola(0n) },
    }),
    harden({
      Bounty: moolaMint.mintPayment(moola(200n)),
    }),
  );
  const bountyInvitation = await funderSeat.getOfferResult();
  const p1 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Fee'),
    moola(50n),
  );
  // Alice gets the funds back.
  const p2 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Bounty'),
    moola(200n),
  );

  // Bob buys the bounty invitation
  const bountySeat = await E(zoe).offer(
    bountyInvitation,
    harden({
      give: { Fee: moola(50n) },
      want: { Bounty: moola(0n) },
    }),
    harden({
      Fee: moolaMint.mintPayment(moola(50n)),
    }),
  );
  const p3 = assertPayoutAmount(
    t,
    moolaIssuer,
    bountySeat.getPayout('Fee'),
    moola(0n),
  );
  // Bob doesn't receive the bounty
  const p4 = assertPayoutAmount(
    t,
    moolaIssuer,
    bountySeat.getPayout('Bounty'),
    moola(0n),
  );

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  await Promise.all([p1, p2, p3, p4]);
});
