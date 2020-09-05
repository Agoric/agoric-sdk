// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import fakeVatAdmin from '../contracts/fakeVatAdmin';
import buildManualTimer from '../../../tools/manualTimer';

const contractRoot = `${__dirname}/zcfTesterContract`;

const setupZCFTest = async (issuerKeywordRecord, terms) => {
  const zoe = makeZoe(fakeVatAdmin);
  const bundle = await bundleSource(contractRoot);
  const installation = await zoe.install(bundle);
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );
  // This contract gives ZCF as the contractFacet for testing purposes
  /** @type ContractFacet */
  const zcf = creatorFacet;
  return { zoe, zcf, instance, installation };
};

// TODO: Still to be tested:
//  * @property {Reallocate} reallocate
//  * @property {() => void} shutdown
//  * @property {MakeZCFMint} makeZCFMint
//  * @property {<Deadline>(exit?: ExitRule<Deadline>) => ZcfSeatKit} makeEmptySeatKit

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

const testTerms = async (t, expected, issuerKeywordRecord, terms) => {
  const { zcf } = await setupZCFTest(issuerKeywordRecord, terms);
  // Note that the amountMath are made locally within Zoe, so they
  // will not match the amountMath gotten from the setup code.
  const zcfTerms = zcf.getTerms();
  const zcfTermsMinusAmountMath = { ...zcfTerms, maths: {} };
  const expectedMinusAmountMath = { ...expected, maths: {} };
  t.deepEqual(zcfTermsMinusAmountMath, expectedMinusAmountMath);

  compareAmountMaths(t, zcfTerms.maths, expected.maths);
};

test(`zcf.getTerms - empty`, async t => {
  await testTerms(t, { brands: {}, issuers: {}, maths: {} });
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
  await testTerms(t, expected, issuerKeywordRecord, customTerms);
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
  await testTerms(t, expected, issuerKeywordRecord, customTerms);
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
  await testTerms(t, expected, issuerKeywordRecord, customTerms);
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

  // We can't use the testTerms helper because we want to call
  // zcf.saveIssuer before making assertions. Mostly duplicated here.
  const { zcf } = await setupZCFTest(issuerKeywordRecord, customTerms);
  /** THE UNIQUE PART */
  // The `await` here is necessary so that the issuer information is actually
  // saved to the terms
  await zcf.saveIssuer(bucksKit.issuer, 'C');
  /** END UNIQUE PART */

  // Note that the amountMath are made locally within Zoe, so they
  // will not match the amountMath gotten from the setup code.
  const zcfTerms = zcf.getTerms();
  const zcfTermsMinusAmountMath = { ...zcfTerms, maths: {} };
  const expectedMinusAmountMath = { ...expected, maths: {} };
  t.deepEqual(zcfTermsMinusAmountMath, expectedMinusAmountMath);

  compareAmountMaths(t, zcfTerms.maths, expected.maths);
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
    message: 'keyword (a string) must be unique\nSee console for error data.',
  });
  t.throws(() => zcf.assertUniqueKeyword('B'), {
    message: 'keyword (a string) must be unique\nSee console for error data.',
  });
  // Unique, but not a valid Keyword
  t.throws(() => zcf.assertUniqueKeyword('a'), {
    message:
      'keyword "a" must be ascii and must start with a capital letter.\nSee console for error data.',
  });
  t.throws(() => zcf.assertUniqueKeyword('3'), {
    message:
      'keyword "3" must be ascii and must start with a capital letter.\nSee console for error data.',
  });
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
  // @ts-ignore
  await t.throwsAsync(() => zcf.saveIssuer(moolaKit.brand, 'A'), {
    // TODO: improve error message
    // https://github.com/Agoric/agoric-sdk/issues/1701
    message: 'o["getBrand"] is not a function',
  });
});

test(`zcf.saveIssuer - bad keyword`, async t => {
  const { moolaKit } = setup();
  const { zcf } = await setupZCFTest();
  // TODO: why does this not throwAsync?
  t.throws(() => zcf.saveIssuer(moolaKit.issuer, 'bad keyword'), {
    message: `keyword "bad keyword" must be ascii and must start with a capital letter.\nSee console for error data.`,
  });
});

test(`zcf.saveIssuer - args reversed`, async t => {
  const { moolaKit } = setup();
  const { zcf } = await setupZCFTest();
  // TODO: why does this not throwAsync?
  // TODO: improve error message
  // https://github.com/Agoric/agoric-sdk/issues/1702
  // @ts-ignore
  t.throws(() => zcf.saveIssuer('A', moolaKit.issuer), {
    message: `(an object) must be a string\nSee console for error data.`,
  });
});

test(`zcf.makeInvitation - no offerHandler`, async t => {
  const { zcf, zoe } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(undefined, 'myInvitation');
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const isLive = await E(invitationIssuer).isLive(invitationP);
  t.truthy(isLive);
  const seat = E(zoe).offer(invitationP);

  // TODO: this should not throw
  // https://github.com/Agoric/agoric-sdk/issues/1703
  // const offerResult = await E(seat).getOfferResult();
  // t.is(offerResult, undefined);
  await t.throwsAsync(() => E(seat).getOfferResult());
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
  // @ts-ignore
  t.throws(() => zcf.makeInvitation(() => {}), {
    message: `invitations must have a description string: (an undefined)\nSee console for error data.`,
  });
});

test(`zcf.makeInvitation - non-string description`, async t => {
  const { zcf } = await setupZCFTest();
  // TODO: improve error message
  // https://github.com/Agoric/agoric-sdk/issues/1704
  // @ts-ignore
  t.throws(() => zcf.makeInvitation(() => {}, { something: 'a' }), {
    message: `invitations must have a description string: (an object)\nSee console for error data.`,
  });
});

test(`zcf.makeInvitation - no customProperties`, async t => {
  const { zcf, zoe, instance, installation } = await setupZCFTest();
  const invitationP = zcf.makeInvitation(() => {}, 'myInvitation');
  // TODO: allow promises for payments
  // https://github.com/Agoric/agoric-sdk/issues/1705
  // @ts-ignore
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
  // TODO: allow promises for payments
  // https://github.com/Agoric/agoric-sdk/issues/1705
  // @ts-ignore
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
  // TODO: allow promises for payments
  // https://github.com/Agoric/agoric-sdk/issues/1705
  // @ts-ignore
  const details = await E(zoe).getInvitationDetails(invitationP);
  t.deepEqual(details, {
    description: 'myInvitation',
    handle: details.handle,
    installation,
    instance,
  });
  t.falsy(typeof details.handle === 'string');
});
