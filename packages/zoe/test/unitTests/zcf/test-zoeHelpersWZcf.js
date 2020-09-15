// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import { E } from '@agoric/eventual-send';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { setup } from '../setupBasicMints';
import {
  swap,
  assertIssuerKeywords,
  assertProposalShape,
} from '../../../src/contractSupport';
import { assertPayoutAmount } from '../../zoeTestHelpers';
import { setupZCFTest } from './setupZcfTest';

const makeOffer = async (zoe, zcf, proposal, payments) => {
  let zcfSeat;
  const getSeat = seat => {
    zcfSeat = seat;
  };
  const invitation = await zcf.makeInvitation(getSeat, 'seat');
  const userSeat = await E(zoe).offer(invitation, proposal, payments);
  return { zcfSeat, userSeat };
};

test(`zoeHelper with zcf - swap`, async t => {
  const {
    moolaIssuer,
    moola,
    moolaMint,
    simoleanIssuer,
    simoleanMint,
    simoleans,
  } = setup();
  const issuerKeywordRecord = { A: moolaIssuer, B: simoleanIssuer };
  const { zoe, zcf } = await setupZCFTest(issuerKeywordRecord);

  const { zcfSeat: aZcfSeat, userSeat: aUserSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(3) }, give: { B: simoleans(7) } }),
    { B: simoleanMint.mintPayment(simoleans(7)) },
  );
  const { zcfSeat: bZcfSeat, userSeat: bUserSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { B: simoleans(3) }, give: { A: moola(5) } }),
    { A: moolaMint.mintPayment(moola(5)) },
  );
  const message = await swap(zcf, aZcfSeat, bZcfSeat);
  t.is(
    message,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  assertPayoutAmount(t, moolaIssuer, await aUserSeat.getPayout('A'), moola(3));
  const seat1PayoutB = await aUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat1PayoutB, simoleans(4));
  const seat2PayoutB = await bUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat2PayoutB, simoleans(3));
  assertPayoutAmount(t, moolaIssuer, await bUserSeat.getPayout('A'), moola(2));
});

test(`zoeHelper with zcf - swap no match`, async t => {
  const {
    moolaIssuer,
    moola,
    moolaMint,
    simoleanIssuer,
    simoleanMint,
    simoleans,
  } = setup();
  const issuerKeywordRecord = { A: moolaIssuer, B: simoleanIssuer };
  const { zoe, zcf } = await setupZCFTest(issuerKeywordRecord);

  const { zcfSeat: aZcfSeat, userSeat: aUserSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(3) } }),
    { B: simoleanMint.mintPayment(simoleans(3)) },
  );
  const { zcfSeat: bZcfSeat, userSeat: bUserSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { B: simoleans(43) }, give: { A: moola(5) } }),
    { A: moolaMint.mintPayment(moola(5)) },
  );
  t.throws(
    () => swap(zcf, aZcfSeat, bZcfSeat),
    {
      message:
        'The trade between left [object Object] and right [object Object] failed. Please check the log for more information',
    },
    'mismatched offers',
  );
  assertPayoutAmount(t, moolaIssuer, await aUserSeat.getPayout('A'), moola(0));
  const seat1PayoutB = await aUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat1PayoutB, simoleans(3));
  const seat2PayoutB = await bUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat2PayoutB, simoleans(0));
  assertPayoutAmount(t, moolaIssuer, await bUserSeat.getPayout('A'), moola(5));
});

test(`zoeHelper with zcf - assertIssuerKeywords`, async t => {
  const {
    moolaIssuer,
    moola,
    simoleanIssuer,
    simoleanMint,
    simoleans,
  } = setup();
  const issuerKeywordRecord = { A: moolaIssuer, B: simoleanIssuer };
  const { zoe, zcf } = await setupZCFTest(issuerKeywordRecord);

  await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(3) } }),
    { B: simoleanMint.mintPayment(simoleans(3)) },
  );

  t.throws(
    () => assertIssuerKeywords(zcf, []),
    {
      message:
        'keywords: (an object) were not as expected: (an object)\nSee console for error data.',
    },
    'empty keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A']),
    {
      message:
        'keywords: (an object) were not as expected: (an object)\nSee console for error data.',
    },
    'missing keyword from keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A', 'b']),
    {
      message:
        'keywords: (an object) were not as expected: (an object)\nSee console for error data.',
    },
    'wrong keyword in keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A', 'B', 'C']),
    {
      message:
        'keywords: (an object) were not as expected: (an object)\nSee console for error data.',
    },
    'extra keywords in keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf),
    {
      message:
        'undefined is not iterable (cannot read property Symbol(Symbol.iterator))',
    },
    'no expected keywordRecord gets an error',
  );
  t.falsy(assertIssuerKeywords(zcf, ['A', 'B']));
});

test.only(`zoeHelper with zcf - assertProposalShape`, async t => {
  const {
    moolaIssuer,
    moola,
    simoleanIssuer,
    simoleanMint,
    simoleans,
  } = setup();
  const issuerKeywordRecord = { A: moolaIssuer, B: simoleanIssuer };
  const { zoe, zcf } = await setupZCFTest(issuerKeywordRecord);

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(3) } }),
    { B: simoleanMint.mintPayment(simoleans(3)) },
  );

  t.falsy(assertProposalShape(zcfSeat, []), 'empty expectation matches');
  t.throws(
    () => assertProposalShape(zcfSeat, { want: { C: undefined } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'empty keywordRecord does not  match',
  );
  t.falsy(assertProposalShape(zcfSeat, { want: { A: null } }));
  t.falsy(assertProposalShape(zcfSeat, { give: { B: null } }));
  t.throws(
    () => assertProposalShape(zcfSeat, { give: { c: undefined } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'wrong key in keywordRecord does not  match',
  );
  t.throws(
    () => assertProposalShape(zcfSeat, { exit: { onDemaind: undefined } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'missing exit rule',
  );
});

test.failing(`zcf/zoeHelper - assertProposalShape w/bad Expected`, async t => {
  const {
    moolaIssuer,
    moola,
    simoleanIssuer,
    simoleanMint,
    simoleans,
  } = setup();
  const issuerKeywordRecord = { A: moolaIssuer, B: simoleanIssuer };
  const { zoe, zcf } = await setupZCFTest(issuerKeywordRecord);

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(3) } }),
    { B: simoleanMint.mintPayment(simoleans(3)) },
  );

  // TODO: providing an amount in the expected record should throw
  // https://github.com/Agoric/agoric-sdk/issues/1769
  t.throws(() => assertProposalShape(zcfSeat, { give: { B: moola(3) } }), {
    message: 'expected record should have null values',
  });
});
