// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import { makeFakeVatAdmin } from '../../../src/contractFacet/fakeVatAdmin';

import '../../../exported';
import { depositToSeat } from '../../../src/contractSupport';
import { assertPayoutAmount } from '../../zoeTestHelpers';

const contractRoot = `${__dirname}/zcfTesterContract`;

async function setupZcf(setupMints) {
  const { moolaIssuer, bucksIssuer } = setupMints;
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { admin: fakeVatAdminSvc } = makeFakeVatAdmin(setJig);
  const zoe = makeZoe(fakeVatAdminSvc);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Cash: moolaIssuer,
    Goods: bucksIssuer,
  });

  // eslint-disable-next-line no-unused-vars
  const { creatorFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );

  // The contract uses the testJig so the contractFacet
  // is available here for testing purposes
  /** @type {ContractFacet} */
  const zcf = testJig.zcf;
  return { zcf, zoe };
}

test(`zcfSeat.makeInvitationWithSeat() basics`, async t => {
  const setupMints = setup();
  const { moolaMint, amountMaths } = setupMints;
  const { zcf } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');

  const handler = _ => {};

  const { zcfSeat, userSeat: userSeatP } = await zcf.makeInvitationWithSeat(
    handler,
    'seat1',
  );
  const moola20 = moolaAmountMath.make(20);
  await depositToSeat(
    zcf,
    zcfSeat,
    { Cash: moola20 },
    { Cash: moolaMint.mintPayment(moola20) },
  );
  const userSeat = await userSeatP;

  const zoeSeatAallocation = await userSeat.getCurrentAllocation();
  t.deepEqual(moola20, zoeSeatAallocation.Cash);
  const zcfSeatAallocation = await zcfSeat.getCurrentAllocation();
  t.deepEqual(moola20, zcfSeatAallocation.Cash);
});

test(`zcfSeat.makeInvitationWithSeat() exercise invitation`, async t => {
  const setupMints = setup();
  const { amountMaths, moolaMint } = setupMints;
  const { zcf, zoe } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');
  const bucksAmountMath = amountMaths.get('bucks');

  const handler = _ => {};

  const {
    invitation,
    zcfSeat,
    userSeat: userSeatP,
  } = await zcf.makeInvitationWithSeat(handler, 'seat1');
  const moola20 = moolaAmountMath.make(20);
  const userSeatEarly = await userSeatP;

  const proposal = harden({
    want: { Goods: bucksAmountMath.make(1000) },
    give: { Money: moola20 },
    exit: {
      onDemand: null,
    },
  });
  const payments = harden({ Money: moolaMint.mintPayment(moola20) });
  const userSeatLate = await zoe.offer(await invitation, proposal, payments);
  t.is(userSeatEarly, await userSeatLate);

  const userSeatAllocation = await userSeatLate.getCurrentAllocation();
  t.deepEqual(moola20, userSeatAllocation.Money);
  const zcfSeatAllocation = await zcfSeat.getCurrentAllocation();
  t.deepEqual(moola20, zcfSeatAllocation.Money);
});

test(`zcfSeat.makeInvitationWithSeat() allocate internally`, async t => {
  const setupMints = setup();
  const { amountMaths, moolaMint } = setupMints;
  const { zcf, zoe } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');
  const bucksAmountMath = amountMaths.get('bucks');

  const handler = _ => {};

  const { invitation, zcfSeat } = await zcf.makeInvitationWithSeat(
    handler,
    'seat1',
  );
  const moola20 = moolaAmountMath.make(20);
  const moola10 = moolaAmountMath.make(10);
  const moola30 = moolaAmountMath.make(30);
  await depositToSeat(
    zcf,
    zcfSeat,
    { Money: moola10 },
    { Money: moolaMint.mintPayment(moola10) },
  );

  const proposal = harden({
    want: { Goods: bucksAmountMath.make(1000) },
    give: { Money: moola20 },
    exit: {
      onDemand: null,
    },
  });
  const payments = harden({ Money: moolaMint.mintPayment(moola20) });
  const userSeat = await zoe.offer(await invitation, proposal, payments);

  const allocation = await userSeat.getCurrentAllocation();
  t.deepEqual(moola30, allocation.Money);
});

test(`zcfSeat.makeInvitationWithSeat() exit`, async t => {
  const setupMints = setup();
  const { moolaIssuer, amountMaths, moolaMint } = setupMints;
  const { zcf, zoe } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');
  const bucksAmountMath = amountMaths.get('bucks');

  const handler = _ => {};

  const { invitation } = await zcf.makeInvitationWithSeat(handler, 'seat1');
  const moola20 = moolaAmountMath.make(20);

  const proposal = harden({
    want: { Goods: bucksAmountMath.make(1000) },
    give: { Money: moola20 },
    exit: {
      onDemand: null,
    },
  });
  const payments = harden({ Money: moolaMint.mintPayment(moola20) });
  const userSeat = await zoe.offer(await invitation, proposal, payments);

  const allocation = await userSeat.getCurrentAllocation();
  t.deepEqual(moola20, allocation.Money);

  userSeat.tryExit();
  const moolaPayout = userSeat.getPayout('Money');
  assertPayoutAmount(t, moolaIssuer, moolaPayout, moola20, 'moola on exit');
});

test(`zcfSeat.makeInvitationWithSeat() offer safety`, async t => {
  const setupMints = setup();
  const { bucksMint, amountMaths, moolaMint } = setupMints;
  const { zcf, zoe } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');
  const bucksAmountMath = amountMaths.get('bucks');

  const handler = _ => {};

  const { invitation, zcfSeat } = await zcf.makeInvitationWithSeat(
    handler,
    'seat1',
  );
  const moola20 = moolaAmountMath.make(20);

  const proposal = harden({
    want: { Goods: bucksAmountMath.make(1000) },
    give: { Money: moola20 },
    exit: {
      onDemand: null,
    },
  });
  const payments = harden({ Money: moolaMint.mintPayment(moola20) });
  const zoeSeat = await zoe.offer(await invitation, proposal, payments);

  const { zcfSeat: holderSeat } = zcf.makeEmptySeatKit();
  const bucks50 = bucksAmountMath.make(50);
  const bucksPayment = bucksMint.mintPayment(bucks50);
  const moolaPayment = moolaMint.mintPayment(moola20);
  const holderAmount = { Goods: bucks50, Stuff: moola20 };
  const paymentToHolder = { Goods: bucksPayment, Stuff: moolaPayment };
  await depositToSeat(zcf, holderSeat, holderAmount, paymentToHolder);

  t.throws(
    () =>
      zcf.reallocate(
        holderSeat.stage({ Goods: moola20 }),
        zcfSeat.stage({ Money: moolaAmountMath.getEmpty() }),
      ),
    { message: 'The reallocation was not offer safe' },
    'expected reallocate() to reject for offer safety.',
  );
  await zcf.reallocate(
    holderSeat.stage({ Goods: bucksAmountMath.getEmpty(), Stuff: moola20 }),
    zcfSeat.stage({ Goods: bucks50, Money: moola20 }),
  );
  t.deepEqual(
    { Goods: bucksAmountMath.getEmpty(), Stuff: moola20 },
    holderSeat.getCurrentAllocation(),
  );
  t.deepEqual(
    { Goods: bucks50, Money: moola20 },
    zcfSeat.getCurrentAllocation(),
  );
  t.deepEqual(
    { Goods: bucks50, Money: moola20 },
    await zoeSeat.getCurrentAllocation(),
  );
});

test(`zcfSeat.makeInvitationWithSeat() notifiers`, async t => {
  const setupMints = setup();
  const { amountMaths, moolaMint } = setupMints;
  const { zcf } = await setupZcf(setupMints);
  const moolaAmountMath = amountMaths.get('moola');

  const handler = _ => {};

  const { userSeat, zcfSeat } = await zcf.makeInvitationWithSeat(
    handler,
    'seat1',
  );

  const zcfNotifier = await E(zcfSeat).getNotifier();
  const zoeNotifier = await E(userSeat).getNotifier();
  const moola10 = moolaAmountMath.make(10);
  await depositToSeat(
    zcf,
    zcfSeat,
    { Money: moola10 },
    { Money: moolaMint.mintPayment(moola10) },
  );

  const expected0 = { value: { Money: moola10 }, updateCount: 2 };
  const zcfResult1 = E(zcfNotifier).getUpdateSince();
  zcfResult1.then(updateRec => {
    t.deepEqual(expected0, updateRec);
  });
  const zoeResult1 = E(zoeNotifier).getUpdateSince();
  await zoeResult1.then(updateRec => {
    t.deepEqual(expected0, updateRec);
  });
});
