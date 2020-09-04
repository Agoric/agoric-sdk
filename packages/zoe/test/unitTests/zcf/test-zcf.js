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

const contractRoot = `${__dirname}/zcfTesterContract`;

const setupZCFTest = async (issuerKeywordRecord, terms) => {
  const zoe = makeZoe(fakeVatAdmin);
  const bundle = await bundleSource(contractRoot);
  const installation = await zoe.install(bundle);
  const { creatorFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );
  // This contract gives ZCF as the contractFacet for testing purposes
  /** @type ContractFacet */
  const zcf = creatorFacet;
  return { zoe, zcf };
};

// TODO: Still to be tested:
//  * @property {Reallocate} reallocate - reallocate amounts among seats
//  * @property {(keyword: Keyword) => void} assertUniqueKeyword - check
//  * whether a keyword is valid and unique and could be added in
//  * `saveIssuer`
//  * @property {SaveIssuer} saveIssuer - save an issuer to ZCF and Zoe
//  * and get the amountMath and brand synchronously accessible after
//  * saving
//  * @property {MakeInvitation} makeInvitation
//  * @property {() => void} shutdown
//  * @property {MakeZCFMint} makeZCFMint
//  * @property {(exit: ExitRule=) => ZcfSeatKit} makeEmptySeatKit

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
