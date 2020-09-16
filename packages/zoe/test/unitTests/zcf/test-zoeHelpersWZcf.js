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
  swapExact,
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
  t.notThrows(() => assertIssuerKeywords(zcf, ['A', 'B']));
});

test(`zoeHelper with zcf - assertProposalShape`, async t => {
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

  t.throws(() => assertProposalShape(zcfSeat, []), {
    message: 'Expected must be an non-array object',
  });
  t.throws(
    () => assertProposalShape(zcfSeat, { want: { C: null } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'empty keywordRecord does not match',
  );
  t.notThrows(() => assertProposalShape(zcfSeat, { want: { A: null } }));
  t.notThrows(() => assertProposalShape(zcfSeat, { give: { B: null } }));
  t.throws(
    () => assertProposalShape(zcfSeat, { give: { c: null } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'wrong key in keywordRecord does not match',
  );
  t.throws(
    () => assertProposalShape(zcfSeat, { exit: { onDemaind: null } }),
    {
      message:
        'actual (an object) did not match expected (an object)\nSee console for error data.',
    },
    'missing exit rule',
  );
});

test(`zoeHelper w/zcf - swapExact`, async t => {
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

  const { zcfSeat: zcfSeatA, userSeat: userSeatA } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(3) } }),
    { B: simoleanMint.mintPayment(simoleans(3)) },
  );
  const { zcfSeat: zcfSeatB, userSeat: userSeatB } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { C: simoleans(3) }, give: { D: moola(20) } }),
    { D: moolaMint.mintPayment(moola(20)) },
  );

  const swapMsg = swapExact(zcf, zcfSeatA, zcfSeatB);

  t.truthy(swapMsg, 'swap succeeded');
  t.truthy(zcfSeatA.hasExited(), 'exit right');
  assertPayoutAmount(t, moolaIssuer, await userSeatA.getPayout('A'), moola(20));
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(0),
  );
  t.deepEqual(Object.getOwnPropertyNames(await userSeatA.getPayouts()), [
    'B',
    'A',
  ]);
  t.truthy(zcfSeatB.hasExited(), 'exit right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatB.getPayout('C'),
    simoleans(3),
  );
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(0));
  t.deepEqual(Object.getOwnPropertyNames(await userSeatB.getPayouts()), [
    'D',
    'C',
  ]);
});

test(`zoeHelper w/zcf - swapExact w/shortage`, async t => {
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

  const { zcfSeat: zcfSeatA, userSeat: userSeatA } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(10) } }),
    { B: simoleanMint.mintPayment(simoleans(10)) },
  );
  const { zcfSeat: zcfSeatB, userSeat: userSeatB } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { C: simoleans(10) }, give: { D: moola(15) } }),
    { D: moolaMint.mintPayment(moola(15)) },
  );

  t.throws(() => swapExact(zcf, zcfSeatA, zcfSeatB), {
    message:
      'The reallocation failed to conserve rights. Please check the log for more information',
  });
  t.truthy(zcfSeatA.hasExited(), 'kickout right');
  assertPayoutAmount(t, moolaIssuer, await userSeatA.getPayout('A'), moola(0));
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'kickout right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatB.getPayout('C'),
    simoleans(0),
  );
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(15));
});

test(`zoeHelper w/zcf - swapExact w/excess`, async t => {
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

  const { zcfSeat: zcfSeatA, userSeat: userSeatA } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(20) }, give: { B: simoleans(10) } }),
    { B: simoleanMint.mintPayment(simoleans(10)) },
  );
  const { zcfSeat: zcfSeatB, userSeat: userSeatB } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { C: simoleans(10) }, give: { D: moola(40) } }),
    { D: moolaMint.mintPayment(moola(40)) },
  );

  t.throws(() => swapExact(zcf, zcfSeatA, zcfSeatB), {
    message:
      'The reallocation failed to conserve rights. Please check the log for more information',
  });
  t.truthy(zcfSeatA.hasExited(), 'kickout right');
  assertPayoutAmount(t, moolaIssuer, await userSeatA.getPayout('A'), moola(0));
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'kickout right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatB.getPayout('C'),
    simoleans(0),
  );
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(40));
});

test(`zoeHelper w/zcf - swapExact w/extra payments`, async t => {
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

  const { zcfSeat: zcfSeatA, userSeat: userSeatA } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: simoleans(10) } }),
    { B: simoleanMint.mintPayment(simoleans(10)) },
  );
  const { zcfSeat: zcfSeatB, userSeat: userSeatB } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { C: simoleans(10) }, give: { D: moola(40) } }),
    { D: moolaMint.mintPayment(moola(40)) },
  );

  t.throws(() => swapExact(zcf, zcfSeatA, zcfSeatB), {
    message:
      'The reallocation failed to conserve rights. Please check the log for more information',
  });
  t.truthy(zcfSeatA.hasExited(), 'kickout right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'kickout right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatB.getPayout('C'),
    simoleans(0),
  );
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(40));
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

  t.throws(() => assertProposalShape(zcfSeat, { give: { B: moola(3) } }), {
    message: `The value of the expected record must be null but was (an object)\nSee console for error data.`,
  });
});
