// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
/** @type {import('ava').TestInterface<any>} */
const test = unknownTest;

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';

import { assert } from '@agoric/assert';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';
import { makeZoeKit } from '../../src/zoeService/zoe.js';

import '../../exported.js';
import '../../src/contracts/exported.js';
import buildManualTimer from '../../tools/manualTimer.js';
import { setup } from './setupBasicMints.js';
import { assertPayoutAmount } from '../zoeTestHelpers.js';
import { makeScriptedOracle } from '../../tools/scriptedOracle.js';

// This test shows how to set up a fake oracle and use it in a contract.

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

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
    const { zoeService: zoe } = makeZoeKit(admin);

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

test('pay bounty', async t => {
  const { zoe, oracleInstallation, bountyInstallation } = t.context;
  // The timer is not build in test.before(), because each test needs its own.
  const timer = buildManualTimer(t.log);
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
  const promise1 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Fee'),
    moola(50n),
  );
  const promise2 = assertPayoutAmount(
    t,
    moolaIssuer,
    funderSeat.getPayout('Bounty'),
    moola(0n),
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
  );
  const promise4 = assertPayoutAmount(
    t,
    moolaIssuer,
    bountySeat.getPayout('Bounty'),
    moola(200n),
  );

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();
  await Promise.all([promise1, promise2, promise3, promise4]);
});

test('pay no bounty', async t => {
  const { zoe, oracleInstallation, bountyInstallation } = t.context;
  // The timer is not build in test.before(), because each test needs its own.
  const timer = buildManualTimer(t.log);
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
