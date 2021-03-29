// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { MathKind, amountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { details as X } from '@agoric/assert';
import { makeOffer } from '../makeOffer';

import { setup } from '../setupBasicMints';
import buildManualTimer from '../../../tools/manualTimer';

import { setupZCFTest } from './setupZcfTest';
import { assertAmountsEqual } from '../../zoeTestHelpers';

test(`zcf.getZoeService`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const zoeService = zcf.getZoeService();
  t.is(zoeService, zoe);
});

test(`zcf.getInvitationIssuer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const zcfInvitationIssuer = zcf.getInvitationIssuer();
  const zoeInvitationIssuer = await E(zoe).getInvitationIssuer();
  t.is(zcfInvitationIssuer, zoeInvitationIssuer);
});

const compareAmountMath = (t, actualMath, expectedMath) => {
  t.is(actualMath.getAmountMathKind(), expectedMath.getAmountMathKind());
  t.is(actualMath.getBrand(), expectedMath.getBrand());
};

const compareAmountMaths = (t, actualMaths, expectedMaths) => {
  t.deepEqual(Object.keys(actualMaths), Object.keys(expectedMaths));
  Object.entries(actualMaths).forEach(([keyword, math]) => {
    const expectedMath = expectedMaths[keyword];
    compareAmountMath(t, math, expectedMath);
  });
};

const testTerms = async (t, zcf, expected) => {
  // Note that the amountMath are made locally within Zoe, so they
  // will not match the amountMath gotten from the setup code.
  const zcfTerms = zcf.getTerms();
  const zcfTermsMinusAmountMath = { ...zcfTerms, maths: {} };
  const expectedMinusAmountMath = { ...expected, maths: {} };
  t.deepEqual(zcfTermsMinusAmountMath, expectedMinusAmountMath);

  compareAmountMaths(t, zcfTerms.maths, expected.maths);
};

test(`zcf.getTerms - empty`, async t => {
  const { zcf } = await setupZCFTest();
  await testTerms(t, zcf, { brands: {}, issuers: {}, maths: {} });
});

test(`zcf.getTerms - custom`, async t => {
  const expected = {
    brands: {},
    issuers: {},
    maths: {},
    whatever: 'whatever',
  };
  const issuerKeywordRecord = undefined;
  const customTerms = {
    whatever: 'whatever',
  };
  const { zcf } = await setupZCFTest(issuerKeywordRecord, customTerms);
  await testTerms(t, zcf, expected);
});

test(`zcf.getTerms - standard overwrites custom`, async t => {
  const expected = {
    brands: {},
    issuers: {},
    maths: {},
  };
  const issuerKeywordRecord = undefined;
  const customTerms = {
    brands: 'whatever',
  };
  const { zcf } = await setupZCFTest(issuerKeywordRecord, customTerms);
  await testTerms(t, zcf, expected);
});

test(`zcf.getTerms - standard with 2 issuers and custom`, async t => {
  const { moolaKit, simoleanKit } = setup();
  const expected = {
    brands: { A: moolaKit.brand, B: simoleanKit.brand },
    issuers: { A: moolaKit.issuer, B: simoleanKit.issuer },
    maths: { A: moolaKit.amountMath, B: simoleanKit.amountMath },
    whatever: 'whatever',
  };
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const customTerms = {
    whatever: 'whatever',
  };
  const { zcf } = await setupZCFTest(issuerKeywordRecord, customTerms);
  await testTerms(t, zcf, expected);
});

test(`zcf.getTerms & zcf.saveIssuer`, async t => {
  const { moolaKit, simoleanKit, bucksKit } = setup();
  const expected = {
    brands: { A: moolaKit.brand, B: simoleanKit.brand, C: bucksKit.brand },
    issuers: { A: moolaKit.issuer, B: simoleanKit.issuer, C: bucksKit.issuer },
    maths: {
      A: moolaKit.amountMath,
      B: simoleanKit.amountMath,
      C: bucksKit.amountMath,
    },
    whatever: 'whatever',
  };
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const customTerms = {
    whatever: 'whatever',
  };
  const { zcf } = await setupZCFTest(issuerKeywordRecord, customTerms);
  await zcf.saveIssuer(bucksKit.issuer, 'C');

  await testTerms(t, zcf, expected);
});

test(`zcf.getBrandForIssuer - from issuerKeywordRecord & zcf.saveIssuer`, async t => {
  const { moolaKit, simoleanKit, bucksKit } = setup();
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const { zcf } = await setupZCFTest(issuerKeywordRecord);
  t.is(zcf.getBrandForIssuer(moolaKit.issuer), moolaKit.brand);
  t.is(zcf.getBrandForIssuer(simoleanKit.issuer), simoleanKit.brand);
  await zcf.saveIssuer(bucksKit.issuer, 'C');
  t.is(zcf.getBrandForIssuer(bucksKit.issuer), bucksKit.brand);
});

test(`zcf.getIssuerForBrand - from issuerKeywordRecord & zcf.saveIssuer`, async t => {
  const { moolaKit, simoleanKit, bucksKit } = setup();
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const { zcf } = await setupZCFTest(issuerKeywordRecord);
  t.is(zcf.getIssuerForBrand(moolaKit.brand), moolaKit.issuer);
  t.is(zcf.getIssuerForBrand(simoleanKit.brand), simoleanKit.issuer);
  await zcf.saveIssuer(bucksKit.issuer, 'C');
  t.is(zcf.getIssuerForBrand(bucksKit.brand), bucksKit.issuer);
});

test(`zcf.getAmountMath - from issuerKeywordRecord & zcf.saveIssuer`, async t => {
  const { moolaKit, simoleanKit, bucksKit } = setup();
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const { zcf } = await setupZCFTest(issuerKeywordRecord);
  compareAmountMath(t, zcf.getAmountMath(moolaKit.brand), moolaKit.amountMath);
  compareAmountMath(
    t,
    zcf.getAmountMath(simoleanKit.brand),
    simoleanKit.amountMath,
  );
  await zcf.saveIssuer(bucksKit.issuer, 'C');
  compareAmountMath(t, zcf.getAmountMath(bucksKit.brand), bucksKit.amountMath);
});

test(`zcf.assertUniqueKeyword`, async t => {
  const { moolaKit, simoleanKit } = setup();
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const { zcf } = await setupZCFTest(issuerKeywordRecord);
  t.throws(() => zcf.assertUniqueKeyword('A'), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /keyword "A" must be unique/,
      /keyword .* must be unique/,
  });
  t.throws(() => zcf.assertUniqueKeyword('B'), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /keyword "B" must be unique/,
      /keyword .* must be unique/,
  });
  // Unique, but not a valid Keyword
  t.throws(() => zcf.assertUniqueKeyword('a'), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // 'keyword "a" must be ascii and must start with a capital letter.',
      /keyword .* must be ascii and must start with a capital letter./,
  });
  t.throws(() => zcf.assertUniqueKeyword('3'), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // 'keyword "3" must be ascii and must start with a capital letter.',
      /keyword .* must be ascii and must start with a capital letter./,
  });
  zcf.assertUniqueKeyword('MyKeyword');
});

test(`zcf.saveIssuer & zoe.getTerms`, async t => {
  const { moolaKit, simoleanKit, bucksKit } = setup();
  const expected = {
    brands: { A: moolaKit.brand, B: simoleanKit.brand, C: bucksKit.brand },
    issuers: { A: moolaKit.issuer, B: simoleanKit.issuer, C: bucksKit.issuer },
    maths: {
      A: moolaKit.amountMath,
      B: simoleanKit.amountMath,
      C: bucksKit.amountMath,
    },
    whatever: 'whatever',
  };
  const issuerKeywordRecord = { A: moolaKit.issuer, B: simoleanKit.issuer };
  const customTerms = {
    whatever: 'whatever',
  };

  const { zcf, instance, zoe } = await setupZCFTest(
    issuerKeywordRecord,
    customTerms,
  );
  await zcf.saveIssuer(bucksKit.issuer, 'C');

  const zoeTerms = await E(zoe).getTerms(instance);
  const zoeTermsMinusAmountMath = { ...zoeTerms, maths: {} };
  const expectedMinusAmountMath = { ...expected, maths: {} };
  t.deepEqual(zoeTermsMinusAmountMath, expectedMinusAmountMath);

  compareAmountMaths(t, zoeTerms.maths, expected.maths);
});

test(`zcf.saveIssuer - bad issuer`, async t => {
  const { moolaKit } = setup();
  const { zcf } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => zcf.saveIssuer(moolaKit.brand, 'A'), {
    // TODO: improve error message
    // https://github.com/Agoric/agoric-sdk/issues/1701
    message:
      'target has no method "getBrand", has ["getAllegedName","getDisplayInfo","isMyIssuer"]',
  });
});

test(`zcf.saveIssuer - bad keyword`, async t => {
  const { moolaKit } = setup();
  const { zcf } = await setupZCFTest();
  await t.throwsAsync(
    async () => zcf.saveIssuer(moolaKit.issuer, 'bad keyword'),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // `keyword "bad keyword" must be ascii and must start with a capital letter.`,
        /keyword .* must be ascii and must start with a capital letter./,
    },
  );
});

test(`zcf.saveIssuer - args reversed`, async t => {
  const { moolaKit } = setup();
  const { zcf } = await setupZCFTest();
  // TODO: improve error message
  // https://github.com/Agoric/agoric-sdk/issues/1702
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(async () => zcf.saveIssuer('A', moolaKit.issuer), {
    message: /.* must be a string/,
  });
});

test(`zcf.makeInvitation - no offerHandler`, async t => {
  const { zcf, zoe } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(undefined, 'myInvitation');
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const isLive = await E(invitationIssuer).isLive(invitationP);
  t.truthy(isLive);
  const seat = E(zoe).offer(invitationP);
  const offerResult = await E(seat).getOfferResult();
  t.is(offerResult, undefined);
});

test(`zcf.makeInvitation - no-op offerHandler`, async t => {
  const { zcf, zoe } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(() => {}, 'myInvitation');
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const isLive = await E(invitationIssuer).isLive(invitationP);
  t.truthy(isLive);
  const seat = E(zoe).offer(invitationP);
  const offerResult = await E(seat).getOfferResult();
  t.is(offerResult, undefined);
});

test(`zcf.makeInvitation - throwing offerHandler`, async t => {
  const { zcf, zoe } = await setupZCFTest();
  const handler = () => {
    throw Error('my error message');
  };
  const invitationP = zcf.makeInvitation(handler, 'myInvitation');
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const isLive = await E(invitationIssuer).isLive(invitationP);
  t.truthy(isLive);
  const seat = E(zoe).offer(invitationP);
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'my error message',
  });
});

test(`zcf.makeInvitation - no description`, async t => {
  const { zcf } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcf.makeInvitation(() => {}), {
    message: /invitations must have a description string: "\[undefined\]"/,
  });
});

test(`zcf.makeInvitation - non-string description`, async t => {
  const { zcf } = await setupZCFTest();
  // TODO: improve error message
  // https://github.com/Agoric/agoric-sdk/issues/1704
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcf.makeInvitation(() => {}, { something: 'a' }), {
    message: /invitations must have a description string: .*/,
  });
});

test(`zcf.makeInvitation - no customProperties`, async t => {
  const { zcf, zoe, instance, installation } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(() => {}, 'myInvitation');
  const details = await E(zoe).getInvitationDetails(invitationP);
  t.deepEqual(details, {
    description: 'myInvitation',
    handle: details.handle,
    installation,
    instance,
  });
});

test(`zcf.makeInvitation - customProperties`, async t => {
  const { zcf, zoe, instance, installation } = await setupZCFTest();
  const timer = buildManualTimer(console.log);
  const invitationP = zcf.makeInvitation(() => {}, 'myInvitation', {
    whatever: 'whatever',
    timer,
  });
  const details = await E(zoe).getInvitationDetails(invitationP);
  t.deepEqual(details, {
    description: 'myInvitation',
    handle: details.handle,
    installation,
    instance,
    timer,
    whatever: 'whatever',
  });
});

test(`zcf.makeInvitation - customProperties overwritten`, async t => {
  const { zcf, zoe, instance, installation } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(() => {}, 'myInvitation', {
    description: 'whatever',
    installation: 'whatever',
    instance: 'whatever',
  });
  const details = await E(zoe).getInvitationDetails(invitationP);
  t.deepEqual(details, {
    description: 'myInvitation',
    handle: details.handle,
    installation,
    instance,
  });
  t.falsy(typeof details.handle === 'string');
});

test(`zcf.makeZCFMint - no keyword`, async t => {
  const { zcf } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => zcf.makeZCFMint(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"\[undefined\]" must be a string/,
      /.* must be a string/,
  });
});

test(`zcf.makeZCFMint - keyword already in use`, async t => {
  const { moolaIssuer } = setup();
  const { zcf } = await setupZCFTest({ A: moolaIssuer });
  await t.throwsAsync(() => zcf.makeZCFMint('A'), {
    message: /Keyword .* already registered/,
  });
});

test(`zcf.makeZCFMint - bad keyword`, async t => {
  const { zcf } = await setupZCFTest();
  await t.throwsAsync(() => zcf.makeZCFMint('a'), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // 'keyword "a" must be ascii and must start with a capital letter.',
      /keyword .* must be ascii and must start with a capital letter./,
  });
});

test(`zcf.makeZCFMint - not a math kind`, async t => {
  const { zcf } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => zcf.makeZCFMint('A', 'whatever'), {
    message: /.* must be MathKind.NAT or MathKind.SET. MathKind.STRING_SET is accepted but deprecated/,
  });
});

test(`zcf.makeZCFMint - NAT`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.NAT);
  const issuerRecord = zcfMint.getIssuerRecord();
  const expected = {
    issuers: { A: issuerRecord.issuer },
    brands: { A: issuerRecord.brand },
    maths: { A: issuerRecord.amountMath },
  };
  await testTerms(t, zcf, expected);
  t.is(issuerRecord.mathKind, MathKind.NAT);
  t.is(issuerRecord.brand.getDisplayInfo(), undefined);
});

test(`zcf.makeZCFMint - STRING_SET`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.STRING_SET);
  const issuerRecord = zcfMint.getIssuerRecord();
  const expected = {
    issuers: { A: issuerRecord.issuer },
    brands: { A: issuerRecord.brand },
    maths: { A: issuerRecord.amountMath },
  };
  await testTerms(t, zcf, expected);
  t.is(issuerRecord.amountMath.getAmountMathKind(), MathKind.STRING_SET);
});

test(`zcf.makeZCFMint - SET`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const issuerRecord = zcfMint.getIssuerRecord();
  const expected = {
    issuers: { A: issuerRecord.issuer },
    brands: { A: issuerRecord.brand },
    maths: { A: issuerRecord.amountMath },
  };
  await testTerms(t, zcf, expected);
  t.is(issuerRecord.mathKind, MathKind.SET);
});

test(`zcf.makeZCFMint - mintGains - no args`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcfMint.mintGains(), {
    message: /gains "\[undefined\]" must be an amountKeywordRecord/,
  });
});

test(`zcf.makeZCFMint - mintGains - no seat`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.NAT);
  const { brand } = zcfMint.getIssuerRecord();
  const zcfSeat = zcfMint.mintGains({ A: amountMath.make(4n, brand) });
  t.truthy(zcfSeat);
  assertAmountsEqual(
    t,
    zcfSeat.getAmountAllocated('A', brand),
    amountMath.make(4n, brand),
  );
});

test(`zcf.makeZCFMint - mintGains - no gains`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { zcfSeat } = zcf.makeEmptySeatKit();
  // TODO: create seat if one is not provided
  // https://github.com/Agoric/agoric-sdk/issues/1696
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcfMint.mintGains(undefined, zcfSeat), {
    message: /gains "\[undefined\]" must be an amountKeywordRecord/,
  });
});

test(`zcf.makeZCFMint - burnLosses - no args`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcfMint.burnLosses(), {
    message: /losses "\[undefined\]" must be an amountKeywordRecord/,
  });
});

test(`zcf.makeZCFMint - burnLosses - no losses`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { zcfSeat } = zcf.makeEmptySeatKit();
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcfMint.burnLosses(undefined, zcfSeat), {
    message: /losses "\[undefined\]" must be an amountKeywordRecord/,
  });
});

test(`zcf.makeZCFMint - mintGains - wrong brand`, async t => {
  const { moola, moolaIssuer } = setup();
  const { zcf } = await setupZCFTest({ Moola: moolaIssuer });

  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { zcfSeat } = zcf.makeEmptySeatKit();
  t.throws(() => zcfMint.mintGains({ Moola: moola(3) }, zcfSeat), {
    message: /Only digital assets of brand .* can be minted in this call. .* has the wrong brand./,
  });
});

test(`zcf.makeZCFMint - burnLosses - wrong brand`, async t => {
  const { moola, moolaIssuer } = setup();
  const { zcf } = await setupZCFTest({ Moola: moolaIssuer });

  const zcfMint = await zcf.makeZCFMint('A', MathKind.SET);
  const { zcfSeat } = zcf.makeEmptySeatKit();
  t.throws(() => zcfMint.burnLosses({ Moola: moola(3) }, zcfSeat), {
    message: /Only digital assets of brand .* can be burned in this call. .* has the wrong brand./,
  });
});

test(`zcf.makeZCFMint - mintGains - right issuer`, async t => {
  const { zcf } = await setupZCFTest();

  const zcfMint = await zcf.makeZCFMint('A');
  const { brand } = zcfMint.getIssuerRecord();
  const { zcfSeat } = zcf.makeEmptySeatKit();
  const zcfSeat2 = zcfMint.mintGains(
    { A: amountMath.make(4n, brand) },
    zcfSeat,
  );
  t.is(zcfSeat2, zcfSeat);
  assertAmountsEqual(
    t,
    zcfSeat.getAmountAllocated('A', brand),
    amountMath.make(4n, brand),
  );
});

test(`zcf.makeZCFMint - burnLosses - right issuer`, async t => {
  const { zcf } = await setupZCFTest();

  const zcfMint = await zcf.makeZCFMint('A');
  const { brand } = zcfMint.getIssuerRecord();
  const { zcfSeat } = zcf.makeEmptySeatKit();
  const zcfSeat2 = zcfMint.mintGains(
    { A: amountMath.make(4n, brand) },
    zcfSeat,
  );
  t.is(zcfSeat2, zcfSeat);
  assertAmountsEqual(
    t,
    zcfSeat.getAmountAllocated('A', brand),
    amountMath.make(4n, brand),
  );
  // TODO: return a seat?
  // https://github.com/Agoric/agoric-sdk/issues/1709
  const result = zcfMint.burnLosses({ A: amountMath.make(1n, brand) }, zcfSeat);
  t.is(result, undefined);
  assertAmountsEqual(
    t,
    zcfSeat.getAmountAllocated('A', brand),
    amountMath.make(3n, brand),
  );
});

test(`zcf.makeZCFMint - mintGains - seat exited`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A');
  const { brand } = zcfMint.getIssuerRecord();
  const { zcfSeat } = zcf.makeEmptySeatKit();
  zcfSeat.exit();
  t.throws(
    () => zcfMint.mintGains({ A: amountMath.make(4n, brand) }, zcfSeat),
    {
      message: `seat has been exited`,
    },
  );
});

test(`zcf.makeZCFMint - burnLosses - seat exited`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint('A');
  const { brand } = zcfMint.getIssuerRecord();
  const { zcfSeat } = zcf.makeEmptySeatKit();
  const zcfSeat2 = zcfMint.mintGains(
    { A: amountMath.make(4n, brand) },
    zcfSeat,
  );
  t.is(zcfSeat2, zcfSeat);
  assertAmountsEqual(
    t,
    zcfSeat.getAmountAllocated('A', brand),
    amountMath.make(4n, brand),
  );
  zcfSeat.exit();
  t.throws(
    () => zcfMint.burnLosses({ A: amountMath.make(1n, brand) }, zcfSeat),
    {
      message: `seat has been exited`,
    },
  );
});

test(`zcf.makeZCFMint - displayInfo`, async t => {
  const { zcf } = await setupZCFTest();
  const zcfMint = await zcf.makeZCFMint(
    'A',
    MathKind.NAT,
    harden({
      decimalPlaces: 3,
    }),
  );
  const issuerRecord = zcfMint.getIssuerRecord();
  const expected = {
    issuers: { A: issuerRecord.issuer },
    brands: { A: issuerRecord.brand },
    maths: { A: issuerRecord.amountMath },
  };
  await testTerms(t, zcf, expected);
  t.is(issuerRecord.brand.getDisplayInfo().decimalPlaces, 3);
});

const similarToNormalZCFSeat = async (t, emptySeat, normalSeat) => {
  // Note: not exhaustive
  t.deepEqual(Object.keys(emptySeat), Object.keys(normalSeat));
  t.deepEqual(emptySeat.getProposal(), normalSeat.getProposal());
  t.deepEqual(
    emptySeat.getCurrentAllocation(),
    normalSeat.getCurrentAllocation(),
  );
  t.is(emptySeat.hasExited(), normalSeat.hasExited());
};

const similarToNormalUserSeat = async (t, emptySeat, normalSeat) => {
  // Note: not exhaustive
  t.deepEqual(Object.keys(emptySeat), Object.keys(normalSeat));
  t.deepEqual(await emptySeat.getProposal(), await normalSeat.getProposal());
  t.deepEqual(
    await emptySeat.getCurrentAllocation(),
    await normalSeat.getCurrentAllocation(),
  );
  t.is(await emptySeat.hasExited(), await normalSeat.hasExited());
  t.is(await emptySeat.getOfferResult(), await normalSeat.getOfferResult());
};

test(`zcf.makeEmptySeatKit`, async t => {
  const { zcf, zoe } = await setupZCFTest();
  const result = zcf.makeEmptySeatKit();
  t.deepEqual(Object.keys(result), ['zcfSeat', 'userSeat']);
  const { zcfSeat: zcfSeatActual, userSeat: userSeatActualP } = result;
  const {
    zcfSeat: zcfSeatExpected,
    userSeat: userSeatExpected,
  } = await makeOffer(zoe, zcf);
  await similarToNormalZCFSeat(t, zcfSeatActual, zcfSeatExpected);
  const userSeatActual = await userSeatActualP;
  await similarToNormalUserSeat(t, userSeatActual, userSeatExpected);
  // Currently seats made with the "makeEmptySeatKit" method cannot
  // have any give or want because we cannot yet escrow or reallocate
  // assets as part of the offer.
  // TODO: add `give` and `want` to seats made on the contract/ZCF side
  // https://github.com/Agoric/agoric-sdk/issues/1724
});

test(`zcfSeat from zcf.makeEmptySeatKit - only these properties exist`, async t => {
  const expectedMethods = [
    'exit',
    'fail',
    'getAmountAllocated',
    'getCurrentAllocation',
    'getNotifier',
    'getProposal',
    'hasExited',
    'isOfferSafe',
    'kickOut', // Deprecated. Remove when we drop kickOut().
    'stage',
  ];
  const { zcf } = await setupZCFTest();
  const makeZCFSeat = () => zcf.makeEmptySeatKit().zcfSeat;
  const seat = makeZCFSeat();
  t.deepEqual(Object.getOwnPropertyNames(seat).sort(), expectedMethods);
});

test(`zcfSeat.getProposal from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const makeZCFSeat = () => zcf.makeEmptySeatKit().zcfSeat;
  const seat = makeZCFSeat();
  t.deepEqual(seat.getProposal(), {
    exit: {
      onDemand: null,
    },
    give: {},
    want: {},
  });
});

test(`zcfSeat.hasExited, exit from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  t.falsy(zcfSeat.hasExited());
  zcfSeat.exit();
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
  t.deepEqual(await E(userSeat).getPayouts(), {});
});

test(`zcfSeat.hasExited, fail from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  t.falsy(zcfSeat.hasExited());
  const msg = `this is the error message`;
  const err = zcfSeat.fail(Error(msg));
  t.is(err.message, msg);
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
  t.deepEqual(await E(userSeat).getPayouts(), {});
});

// TODO(1837): remove deprecated kickOut
test(`zcfSeat.kickOut, fail from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  t.falsy(zcfSeat.hasExited());
  const msg = `this is the error message`;
  const err = zcfSeat.kickOut(Error(msg));
  t.is(err.message, msg);
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
  t.deepEqual(await E(userSeat).getPayouts(), {});
});

test(`zcfSeat.isOfferSafe from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { moola } = setup();
  const { zcfSeat } = zcf.makeEmptySeatKit();
  // Anything is offer safe with no want or give
  // @ts-ignore deliberate invalid arguments for testing
  t.truthy(zcfSeat.isOfferSafe());
  t.truthy(zcfSeat.isOfferSafe({ Moola: moola(0n) }));
  t.truthy(zcfSeat.isOfferSafe({ Moola: moola(10) }));
});

const allocateEasy = async (
  zcf,
  zcfMintKeyword,
  zcfSeat,
  gainsKeyword,
  gainsValue,
) => {
  // Mint some gains to change the allocation.
  const zcfMint = await zcf.makeZCFMint(zcfMintKeyword);
  const { brand } = zcfMint.getIssuerRecord();
  zcfMint.mintGains(
    { [gainsKeyword]: amountMath.make(gainsValue, brand) },
    zcfSeat,
  );
  return zcfMint.getIssuerRecord();
};

test(`zcfSeat.getNotifier`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  const notifier = zcfSeat.getNotifier();
  // These are different notifiers
  t.not(notifier, await E(userSeat).getNotifier());

  // Mint some gains to change the allocation.
  const { brand: brand1 } = await allocateEasy(zcf, 'Stuff', zcfSeat, 'A', 3);
  t.deepEqual(await notifier.getUpdateSince(), {
    updateCount: 2,
    value: {
      A: {
        brand: brand1,
        value: 3n,
      },
    },
  });

  const { brand: brand2 } = await allocateEasy(zcf, 'Stuff2', zcfSeat, 'B', 6);
  t.deepEqual(await notifier.getUpdateSince(2), {
    updateCount: 3,
    value: {
      A: {
        brand: brand1,
        value: 3n,
      },
      B: {
        brand: brand2,
        value: 6n,
      },
    },
  });

  zcfSeat.exit();

  t.deepEqual(await notifier.getUpdateSince(3), {
    updateCount: undefined,
    value: undefined,
  });
});

test(`zcfSeat.getCurrentAllocation from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();

  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    await E(userSeat).getCurrentAllocation(),
  );
  t.deepEqual(zcfSeat.getCurrentAllocation(), {});

  // Mint some gains to change the allocation.
  const { brand: brand1 } = await allocateEasy(zcf, 'Stuff', zcfSeat, 'A', 3);

  t.deepEqual(zcfSeat.getCurrentAllocation(), {
    A: {
      brand: brand1,
      value: 3n,
    },
  });

  // Again, mint some gains to change the allocation.
  const { brand: brand2 } = await allocateEasy(zcf, 'Stuff2', zcfSeat, 'B', 6);

  t.deepEqual(zcfSeat.getCurrentAllocation(), {
    A: {
      brand: brand1,
      value: 3n,
    },
    B: {
      brand: brand2,
      value: 6n,
    },
  });

  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    await E(userSeat).getCurrentAllocation(),
  );
});

test(`zcfSeat.getAmountAllocated from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat } = zcf.makeEmptySeatKit();

  // Mint some gains to change the allocation.
  const { brand: brand1 } = await allocateEasy(zcf, 'Stuff', zcfSeat, 'A', 3);

  assertAmountsEqual(t, zcfSeat.getAmountAllocated('A', brand1), {
    brand: brand1,
    value: 3n,
  });

  // Again, mint some gains to change the allocation.
  const { brand: brand2 } = await allocateEasy(zcf, 'Stuff2', zcfSeat, 'B', 6);

  assertAmountsEqual(t, zcfSeat.getAmountAllocated('B'), {
    brand: brand2,
    value: 6n,
  });

  assertAmountsEqual(t, zcfSeat.getAmountAllocated('B', brand2), {
    brand: brand2,
    value: 6n,
  });

  t.throws(() => zcfSeat.getAmountAllocated('DoesNotExist'), {
    message: `A brand must be supplied when the keyword is not defined`,
  });
});

test(`zcfSeat.stage, zcf.reallocate from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat: zcfSeat1 } = zcf.makeEmptySeatKit();
  const { zcfSeat: zcfSeat2 } = zcf.makeEmptySeatKit();

  const issuerRecord1 = await allocateEasy(zcf, 'Stuff', zcfSeat1, 'A', 6);
  const staging1 = zcfSeat1.stage({
    A: amountMath.make(0n, issuerRecord1.brand),
  });
  const staging2 = zcfSeat2.stage({
    B: amountMath.make(6n, issuerRecord1.brand),
  });

  zcf.reallocate(staging1, staging2);

  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    A: amountMath.make(0n, issuerRecord1.brand),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: amountMath.make(6n, issuerRecord1.brand),
  });
});

test(`userSeat from zcf.makeEmptySeatKit - only these properties exist`, async t => {
  const expectedMethods = [
    'getCurrentAllocation',
    'getProposal',
    'getPayouts',
    'getPayout',
    'getOfferResult',
    'hasExited',
    'tryExit',
    'getNotifier',
  ];
  const { zcf } = await setupZCFTest();
  const { userSeat: userSeatP } = zcf.makeEmptySeatKit();
  const userSeat = await userSeatP;
  // Note: these tests will fail if Zoe is actually in a different
  // vat, since userSeat would be a presence.
  t.deepEqual(Object.keys(userSeat), expectedMethods);
});

test(`userSeat.getProposal from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const makeUserSeat = async () => zcf.makeEmptySeatKit().userSeat;
  const userSeat = await makeUserSeat();
  t.deepEqual(await E(userSeat).getProposal(), {
    exit: {
      onDemand: null,
    },
    give: {},
    want: {},
  });
});

test(`userSeat.tryExit from zcf.makeEmptySeatKit - onDemand`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  t.falsy(zcfSeat.hasExited());
  await E(userSeat).tryExit();
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
  t.deepEqual(await E(userSeat).getPayouts(), {});
});

test(`userSeat.tryExit from zcf.makeEmptySeatKit - waived`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit({ waived: null });
  t.falsy(zcfSeat.hasExited());
  await t.throwsAsync(() => E(userSeat).tryExit(), {
    message: 'Only seats with the exit rule "onDemand" can exit at will',
  });
  t.falsy(zcfSeat.hasExited());
  t.falsy(await E(userSeat).hasExited());
});

test(`userSeat.tryExit from zcf.makeEmptySeatKit - afterDeadline`, async t => {
  const { zcf } = await setupZCFTest();
  const timer = buildManualTimer(console.log);
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit({
    afterDeadline: { timer, deadline: 1n },
  });
  t.falsy(zcfSeat.hasExited());
  await t.throwsAsync(() => E(userSeat).tryExit(), {
    message: 'Only seats with the exit rule "onDemand" can exit at will',
  });
  t.falsy(zcfSeat.hasExited());
  t.falsy(await E(userSeat).hasExited());
  timer.tick();

  // Note: the wake call doesn't happen immediately so we must wait
  const payouts = await E(userSeat).getPayouts();
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
  t.deepEqual(payouts, {});
});

test(`userSeat.getCurrentAllocation from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();

  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    await E(userSeat).getCurrentAllocation(),
  );
  t.deepEqual(await E(userSeat).getCurrentAllocation(), {});

  // Mint some gains to change the allocation.
  const { brand: brand1 } = await allocateEasy(zcf, 'Stuff', zcfSeat, 'A', 3);

  t.deepEqual(await E(userSeat).getCurrentAllocation(), {
    A: {
      brand: brand1,
      value: 3n,
    },
  });

  // Again, mint some gains to change the allocation.
  const { brand: brand2 } = await allocateEasy(zcf, 'Stuff2', zcfSeat, 'B', 6);

  t.deepEqual(await E(userSeat).getCurrentAllocation(), {
    A: {
      brand: brand1,
      value: 3n,
    },
    B: {
      brand: brand2,
      value: 6n,
    },
  });

  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    await E(userSeat).getCurrentAllocation(),
  );
});

test(`userSeat.getOfferResult from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { userSeat } = zcf.makeEmptySeatKit();
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});

test(`userSeat.getNotifier`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  const notifier = await E(userSeat).getNotifier();

  // Mint some gains to change the allocation.
  const { brand: brand1 } = await allocateEasy(zcf, 'Stuff', zcfSeat, 'A', 3);
  t.deepEqual(await notifier.getUpdateSince(), {
    updateCount: 2,
    value: {
      A: {
        brand: brand1,
        value: 3n,
      },
    },
  });

  const { brand: brand2 } = await allocateEasy(zcf, 'Stuff2', zcfSeat, 'B', 6);
  t.deepEqual(await notifier.getUpdateSince(2), {
    updateCount: 3,
    value: {
      A: {
        brand: brand1,
        value: 3n,
      },
      B: {
        brand: brand2,
        value: 6n,
      },
    },
  });

  zcfSeat.exit();

  t.deepEqual(await notifier.getUpdateSince(3), {
    updateCount: undefined,
    value: undefined,
  });
});

test(`userSeat.getPayouts, getPayout from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();

  // Mint some gains to change the allocation.
  const { brand: brand1, issuer: issuer1 } = await allocateEasy(
    zcf,
    'Stuff',
    zcfSeat,
    'A',
    3,
  );

  // Again, mint some gains to change the allocation.
  const { brand: brand2, issuer: issuer2 } = await allocateEasy(
    zcf,
    'Stuff2',
    zcfSeat,
    'B',
    6,
  );

  t.deepEqual(await E(userSeat).getCurrentAllocation(), {
    A: {
      brand: brand1,
      value: 3n,
    },
    B: {
      brand: brand2,
      value: 6n,
    },
  });

  zcfSeat.exit();

  const payoutPs = await E(userSeat).getPayouts();
  const payoutAP = E(userSeat).getPayout('A');
  const payoutBP = E(userSeat).getPayout('B');

  t.deepEqual(await payoutPs.A, await payoutAP);
  t.deepEqual(await payoutPs.B, await payoutBP);

  assertAmountsEqual(t, await E(issuer1).getAmountOf(payoutAP), {
    brand: brand1,
    value: 3n,
  });
  assertAmountsEqual(t, await E(issuer2).getAmountOf(payoutBP), {
    brand: brand2,
    value: 6n,
  });
});

test(`userSeat.getPayout() should throw from zcf.makeEmptySeatKit`, async t => {
  const { zcf } = await setupZCFTest();
  const { userSeat } = zcf.makeEmptySeatKit();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(userSeat).getPayout(), {
    message: 'A keyword must be provided',
  });
});

test(`zcf.reallocate < 2 seats`, async t => {
  const { zcf } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => zcf.reallocate(), {
    message: 'reallocating must be done over two or more seats',
  });
});

test(`zcf.reallocate 3 seats, rights conserved`, async t => {
  const { moolaKit, simoleanKit, moola, simoleans } = setup();
  const { zoe, zcf } = await setupZCFTest({
    Moola: moolaKit.issuer,
    Simoleans: simoleanKit.issuer,
  });

  const { zcfSeat: zcfSeat1 } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: simoleans(2) }, give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );
  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({
      want: { Whatever: moola(2) },
      give: { Whatever2: simoleans(2) },
    }),
    harden({ Whatever2: simoleanKit.mint.mintPayment(simoleans(2)) }),
  );

  const { zcfSeat: zcfSeat3 } = await makeOffer(
    zoe,
    zcf,
    harden({
      want: { Whatever: moola(1) },
    }),
  );

  const staging1 = zcfSeat1.stage({
    A: simoleans(2),
    B: moola(0n),
  });

  const staging2 = zcfSeat2.stage({
    Whatever: moola(2),
    Whatever2: simoleans(0),
  });

  const staging3 = zcfSeat3.stage({
    Whatever: moola(1),
    Whatever2: simoleans(0),
  });

  zcf.reallocate(staging1, staging2, staging3);
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    A: simoleans(2),
    B: moola(0n),
  });

  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    Whatever: moola(2),
    Whatever2: simoleans(0),
  });

  t.deepEqual(zcfSeat3.getCurrentAllocation(), {
    Whatever: moola(1),
    Whatever2: simoleans(0),
  });
});

test(`zcf.reallocate 3 seats, rights NOT conserved`, async t => {
  const { moolaKit, simoleanKit, moola, simoleans } = setup();
  const { zoe, zcf } = await setupZCFTest({
    Moola: moolaKit.issuer,
    Simoleans: simoleanKit.issuer,
  });

  const { zcfSeat: zcfSeat1 } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: simoleans(2) }, give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );
  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({
      want: { Whatever: moola(2) },
      give: { Whatever2: simoleans(2) },
    }),
    harden({ Whatever2: simoleanKit.mint.mintPayment(simoleans(2)) }),
  );

  const { zcfSeat: zcfSeat3 } = await makeOffer(
    zoe,
    zcf,
    harden({
      want: { Whatever: moola(1) },
    }),
  );

  const staging1 = zcfSeat1.stage({
    A: simoleans(100),
    B: moola(0n),
  });

  const staging2 = zcfSeat2.stage({
    Whatever: moola(2),
    Whatever2: simoleans(0),
  });

  const staging3 = zcfSeat3.stage({
    Whatever: moola(1),
    Whatever2: simoleans(0),
  });

  t.throws(() => zcf.reallocate(staging1, staging2, staging3), {
    message: /rights were not conserved for brand .*/,
  });

  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    A: simoleans(0),
    B: moola(3),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    Whatever: moola(0n),
    Whatever2: simoleans(2),
  });
  t.deepEqual(zcfSeat3.getCurrentAllocation(), { Whatever: moola(0n) });
});

test(`zcf.shutdown - userSeat exits`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const { userSeat } = await makeOffer(zoe, zcf);
  zcf.shutdown('so long');
  t.deepEqual(await E(userSeat).getPayouts(), {});
  t.truthy(await E(userSeat).hasExited());
});

test(`zcf.shutdown - zcfSeat exits`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const { zcfSeat, userSeat } = await makeOffer(zoe, zcf);
  t.falsy(zcfSeat.hasExited());
  await t.falsy(await E(userSeat).hasExited());
  zcf.shutdown('done');
  t.truthy(zcfSeat.hasExited());
  t.truthy(await E(userSeat).hasExited());
});

test(`zcf.shutdown - no further offers accepted`, async t => {
  const { zoe, zcf, vatAdminState } = await setupZCFTest();
  const invitation = await zcf.makeInvitation(() => {}, 'seat');
  zcf.shutdown('sayonara');
  await t.throwsAsync(() => E(zoe).offer(invitation), {
    message: 'No further offers are accepted',
  });
  t.is(vatAdminState.getExitMessage(), 'sayonara');
  t.falsy(vatAdminState.getExitWithFailure());
});

test(`zcf.shutdownWithFailure - no further offers accepted`, async t => {
  const { zoe, zcf, vatAdminState } = await setupZCFTest();
  const invitation = await zcf.makeInvitation(() => {}, 'seat');
  zcf.shutdownWithFailure(`And don't come back`);
  await t.throwsAsync(() => E(zoe).offer(invitation), {
    message: 'No further offers are accepted',
  });
  t.is(vatAdminState.getExitMessage(), `And don't come back`);
  t.truthy(vatAdminState.getExitWithFailure());
});

test(`zcf.assert - no further offers accepted`, async t => {
  const { zoe, zcf, vatAdminState } = await setupZCFTest();
  const invitation = await zcf.makeInvitation(() => {}, 'seat');
  t.throws(() => zcf.assert(false, X`And do not come back`), {
    message: /And do not come back/,
  });
  await t.throwsAsync(() => E(zoe).offer(invitation), {
    message: 'No further offers are accepted',
  });
  t.deepEqual(vatAdminState.getExitMessage(), Error(`And do not come back`));
  t.truthy(vatAdminState.getExitWithFailure());
});

test(`zcf.stopAcceptingOffers`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitation1 = await zcf.makeInvitation(() => {}, 'seat');
  const invitation2 = await zcf.makeInvitation(() => {}, 'seat');

  const invitationIssuer = await E(zoe).getInvitationIssuer();
  t.truthy(await E(invitationIssuer).isLive(invitation1));
  t.truthy(await E(invitationIssuer).isLive(invitation2));
  const seat = E(zoe).offer(invitation1);
  const offerResult = await E(seat).getOfferResult();
  t.is(offerResult, undefined);

  t.falsy(await E(invitationIssuer).isLive(invitation1));
  await zcf.stopAcceptingOffers();
  t.truthy(await E(invitationIssuer).isLive(invitation2));
  await t.throwsAsync(
    () => E(zoe).offer(invitation2),
    { message: 'No further offers are accepted' },
    `can't make further offers`,
  );

  t.deepEqual(
    await E(seat).getCurrentAllocation(),
    {},
    'can still query live seat',
  );
});
