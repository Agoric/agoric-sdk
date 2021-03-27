// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { MathKind, makeIssuerKit } from '@agoric/ertp';
import { setup } from '../setupBasicMints';
import {
  swap,
  assertIssuerKeywords,
  assertProposalShape,
  swapExact,
  assertUsesNatMath,
  saveAllIssuers,
} from '../../../src/contractSupport';
import { assertPayoutAmount } from '../../zoeTestHelpers';
import { setupZCFTest } from './setupZcfTest';
import { makeOffer } from '../makeOffer';

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
        'The trade between left [object Object] and right [object Object] failed.',
    },
    'mismatched offers',
  );
  assertPayoutAmount(t, moolaIssuer, await aUserSeat.getPayout('A'), moola(0n));
  const seat1PayoutB = await aUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat1PayoutB, simoleans(3));
  const seat2PayoutB = await bUserSeat.getPayout('B');
  assertPayoutAmount(t, simoleanIssuer, seat2PayoutB, simoleans(0));
  assertPayoutAmount(t, moolaIssuer, await bUserSeat.getPayout('A'), moola(5));
});

test(`zcf assertUsesNatMath`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A');
  const { brand } = zcfMint.getIssuerRecord();
  t.notThrows(() => assertUsesNatMath(zcf, brand), 'default');
});

test(`zcf assertUsesNatMath - not natMath`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { brand } = zcfMint.getIssuerRecord();
  t.throws(() => assertUsesNatMath(zcf, brand), {
    message: 'issuer must use NAT amountMath',
  });
});

test.failing(`zcf assertUsesNatMath - not brand`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { issuer } = zcfMint.getIssuerRecord();
  // TODO: distinguish non-brands from brands
  // https://github.com/Agoric/agoric-sdk/issues/1800
  t.throws(() => assertUsesNatMath(zcf, issuer), {
    message: /assertUsesNatMath requires a brand, not .*/,
  });
});

test(`zcf assertUsesNatMath - brand not registered`, async t => {
  const { zcf } = await setupZCFTest();
  const { brand } = makeIssuerKit('gelt');
  t.throws(() => assertUsesNatMath(zcf, brand), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"brand" not found: .*/,
      /.* not found: .*/,
  });
});

test(`zcf saveAllIssuers`, async t => {
  const { zcf } = await setupZCFTest();
  const { issuer, brand } = makeIssuerKit('gelt');
  await saveAllIssuers(zcf, { G: issuer });
  t.is(zcf.getBrandForIssuer(issuer), brand, 'gelt');
});

test(`zcf saveAllIssuers - multiple`, async t => {
  const { zcf } = await setupZCFTest();
  const { issuer: gIssuer, brand: gBrand } = makeIssuerKit('gelt');
  const { issuer: dIssuer, brand: dBrand } = makeIssuerKit('doubloons');
  const { issuer: pIssuer, brand: pBrand } = makeIssuerKit(
    'pieces of eight',
    MathKind.SET,
  );

  await saveAllIssuers(zcf, { G: gIssuer, D: dIssuer, P: pIssuer });

  t.is(zcf.getBrandForIssuer(gIssuer), gBrand, 'gelt');
  t.is(zcf.getIssuerForBrand(dBrand), dIssuer, 'doubloons');
  t.is(zcf.getBrandForIssuer(pIssuer), pBrand, 'pieces of eight');
});

test(`zcf saveAllIssuers - already known`, async t => {
  const { zcf } = await setupZCFTest();
  const { issuer: kIssuer, brand: kBrand } = makeIssuerKit('krugerrand');

  await saveAllIssuers(zcf, { K: kIssuer });
  t.is(zcf.getBrandForIssuer(kIssuer), kBrand, 'gelt');

  await saveAllIssuers(zcf, { R: kIssuer });
  t.deepEqual(zcf.getTerms().issuers.R, kIssuer);
  t.deepEqual(zcf.getTerms().issuers.K, kIssuer);
  t.is(zcf.getIssuerForBrand(kBrand), kIssuer, 'gelt');
});

test(`zcf saveAllIssuers - duplicate keyword`, async t => {
  const { zcf } = await setupZCFTest();

  const { issuer: pandaIssuer, brand: pandaBrand } = makeIssuerKit('panda');
  await saveAllIssuers(zcf, { P: pandaIssuer });
  t.is(zcf.getBrandForIssuer(pandaIssuer), pandaBrand, 'panda');

  const { issuer: pIssuer, brand: pBrand } = makeIssuerKit(
    'pieces of eight',
    MathKind.SET,
  );

  await t.notThrowsAsync(
    () => saveAllIssuers(zcf, { P: pIssuer }),
    'second issuer with same keyword should be ignored.',
  );
  t.is(zcf.getBrandForIssuer(pandaIssuer), pandaBrand, 'gelt');

  t.throws(
    () => zcf.getBrandForIssuer(pIssuer),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // /"issuer" not found: .*/,
        /.* not found: .*/,
    },
    'issuer should not be found',
  );

  t.notThrows(() => assertUsesNatMath(zcf, pandaBrand), 'default');
  t.throws(() => assertUsesNatMath(zcf, pBrand), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"brand" not found: .*/,
      /.* not found: .*/,
  });
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
      message: /keywords: .* were not as expected: .*/,
    },
    'empty keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A']),
    {
      message: /keywords: .* were not as expected: .*/,
    },
    'missing keyword from keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A', 'b']),
    {
      message: /keywords: .* were not as expected: .*/,
    },
    'wrong keyword in keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf, ['A', 'B', 'C']),
    {
      message: /keywords: .* were not as expected: .*/,
    },
    'extra keywords in keywordRecord does not match',
  );
  t.throws(
    () => assertIssuerKeywords(zcf),
    {
      // host-defined error message differs between node and XS. (agoric-sdk/issues/1780)
      message: /undefined/,
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

  // @ts-ignore invalid arguments for testing
  t.throws(() => assertProposalShape(zcfSeat, []), {
    message: 'Expected must be an non-array object',
  });
  t.throws(
    () => assertProposalShape(zcfSeat, { want: { C: null } }),
    {
      message: /actual .* did not match expected .*/,
    },
    'empty keywordRecord does not match',
  );
  t.notThrows(() => assertProposalShape(zcfSeat, { want: { A: null } }));
  t.notThrows(() => assertProposalShape(zcfSeat, { give: { B: null } }));
  t.throws(
    () => assertProposalShape(zcfSeat, { give: { c: null } }),
    {
      message: /actual .* did not match expected .*/,
    },
    'wrong key in keywordRecord does not match',
  );
  t.throws(
    () => assertProposalShape(zcfSeat, { exit: { onDemaind: null } }),
    {
      message: /actual .* did not match expected .*/,
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
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(0n));
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
    message: 'The reallocation failed to conserve rights.',
  });
  t.truthy(zcfSeatA.hasExited(), 'fail right');
  assertPayoutAmount(t, moolaIssuer, await userSeatA.getPayout('A'), moola(0n));
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'fail right');
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
    message: 'The reallocation failed to conserve rights.',
  });
  t.truthy(zcfSeatA.hasExited(), 'fail right');
  assertPayoutAmount(t, moolaIssuer, await userSeatA.getPayout('A'), moola(0n));
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'fail right');
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
    message: 'The reallocation failed to conserve rights.',
  });
  t.truthy(zcfSeatA.hasExited(), 'fail right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatA.getPayout('B'),
    simoleans(10),
  );
  t.truthy(zcfSeatB.hasExited(), 'fail right');
  assertPayoutAmount(
    t,
    simoleanIssuer,
    await userSeatB.getPayout('C'),
    simoleans(0),
  );
  assertPayoutAmount(t, moolaIssuer, await userSeatB.getPayout('D'), moola(40));
});

test(`zcf/zoeHelper - assertProposalShape w/bad Expected`, async t => {
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

  // @ts-ignore invalid arguments for testing
  t.throws(() => assertProposalShape(zcfSeat, { give: { B: moola(3) } }), {
    message: /The value of the expected record must be null but was .*/,
  });
});
