// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';
import { Far, makeLoopback } from '@agoric/captp';
import { resolve as metaResolve } from 'import-meta-resolve';
import bundleSource from '@agoric/bundle-source';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
// import { makeLoopback } from '@agoric/captp';

import { ParamType } from '@agoric/governance';
import { CreditTerms } from '../src/runLoC.js';
import * as testCases from './runLoC-test-case-sheet.js';

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */
/** @typedef {Unpromise<ReturnType<typeof import('@agoric/zoe/src/contracts/attestation/attestation.js').start>>} StartAttestationResult */
/** @typedef {Unpromise<ReturnType<typeof import('../src/runLoC.js').start>>} StartLineOfCredit */

const { assign, entries, fromEntries, keys, values } = Object;
const { details: X } = assert;

/**
 * @param {Record<string, V>} obj
 * @param {(v: V) => U} f
 * @returns {Record<string, U>}
 * @template V
 * @template U
 */
const mapValues = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [p, f(v)]));
/**
 * @param {X[]} xs
 * @param {Y[]} ys
 * @returns {[X, Y][]}
 * @template X
 * @template Y
 */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
/**
 * @param {Record<string, ERef<V>>} obj
 * @returns {Promise<Record<string, V>>}
 * @template V
 */
const allValues = async obj =>
  fromEntries(zip(keys(obj), await Promise.all(values(obj))));

/** @param { string } ref */
const asset = async ref =>
  new URL(await metaResolve(ref, import.meta.url)).pathname;

const contractRoots = {
  runLoC: '../src/runLoC.js',
  attestation: '@agoric/zoe/src/contracts/attestation/attestation.js',
  electorate: '@agoric/governance/src/noActionElectorate.js',
  governor: '@agoric/governance/src/contractGovernor.js',
  faker: './attestationFaker.js',
};

test.before(async t => {
  t.log('bundling...', contractRoots);
  const bundles = await allValues(
    mapValues(contractRoots, spec => asset(spec).then(bundleSource)),
  );
  t.log(
    'bundled:',
    mapValues(bundles, b => b.endoZipBase64.length),
  );
  assign(t.context, { bundles });
});

/**
 * @param { import('ava').ExecutionContext } t
 */
const genesis = async t => {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };

  const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

  const {
    zoeService: nonFarZoeService,
    feeMintAccess: nonFarFeeMintAccess,
  } = makeZoeKit(makeFakeVatAdmin(setJig, makeRemote).admin);
  const feePurse = E(nonFarZoeService).makeFeePurse();
  const { brand: runBrandThere } = await E(feePurse).getCurrentAmount();
  const [runBrand, zoeService, feeMintAccess] = await Promise.all([
    makeFar(runBrandThere),
    E(nonFarZoeService).bindDefaultFeePurse(feePurse),
    makeFar(nonFarFeeMintAccess),
  ]);
  const zoe = makeFar(zoeService);
  const installations = await allValues(
    mapValues(t.context.bundles, b => E(zoe).install(b)),
  );
  return { zoe, feeMintAccess, runBrand, installations, getJig: () => testJig };
};

test('RUN mint access', async t => {
  assert.typeof(t.context, 'object');
  assert(t.context);

  const { zoe, feeMintAccess } = await genesis(t);
  t.truthy(zoe);
  t.truthy(feeMintAccess);
});

/**
 * @param {Installation} installation
 * @param {ERef<ZoeService>} zoe
 */
const startAttestation = async (installation, zoe) => {
  const { brand: bldBrand, issuer: bldIssuer } = makeIssuerKit(
    'BLD',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );

  /** @type {StartAttestationResult} */
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    harden({ Underlying: bldIssuer }),
    harden({
      expiringAttName: 'BldAttGov',
      returnableAttName: 'BldAttLoC',
    }),
  );

  const [
    { returnable: attIssuer },
    { returnable: attBrand },
  ] = await Promise.all([
    E(publicFacet).getIssuers(),
    E(publicFacet).getBrands(),
  ]);

  return {
    issuers: { Attestation: attIssuer, BLD: bldIssuer },
    brands: { BLD: bldBrand, Attestation: attBrand },
    publicFacet,
    creatorFacet,
  };
};

/**
 * @param {Brand} uBrand
 * @param { string } myAddress
 * @param {Account} account
 * @typedef {{ total: bigint, bonded: bigint, locked: bigint}} Account
 */
const makeStakeReporter = (uBrand, myAddress, account) => {
  const ubld = v => AmountMath.make(uBrand, v);
  return Far('stakeReporter', {
    /**
     * @param { string } address
     * @param { Brand } brand
     */
    getAccountState: (address, brand) => {
      assert(brand === uBrand, X`unexpected brand: ${brand}`);
      assert(address === myAddress, X`no such account: ${address}`);
      return harden({
        ...mapValues(account, ubld),
        currentTime: 60n,
      });
    },
  });
};

test('start attestation', async t => {
  const { zoe, installations } = await genesis(t);

  const a = await startAttestation(installations.attestation, zoe);
  // t.log('attestation start result', a);
  const {
    brands: { BLD: bldBrand, Attestation: attBrand },
  } = a;
  const ubld = v => AmountMath.make(bldBrand, v);

  await E(a.creatorFacet).addAuthority(
    makeStakeReporter(bldBrand, 'address1', {
      total: 10n,
      bonded: 9n,
      locked: 1n,
    }),
  );

  const attMaker = E(a.creatorFacet).getAttMaker('address1');
  const expiration = 65n;
  const att = await E(attMaker).makeAttestations(ubld(5n), expiration);
  // t.log('attestation', att);
  t.truthy(att);
  const pmt = await att.returnable;
  // t.log({ pmt });
  t.truthy(pmt);
});

/**
 * @param { import('ava').ExecutionContext } t
 * @param {ERef<ZoeService>} zoe
 * @param { FeeMintAccess } feeMintAccess
 * @param {Record<string, Installation>} installations
 * @param {Object} terms
 * @param {Ratio} terms.collateralPrice
 * @param {Ratio} terms.collateralizationRate
 * @param {Issuer} attIssuer
 */
const startGovernedLoC = async (
  t,
  zoe,
  feeMintAccess,
  installations,
  { collateralPrice, collateralizationRate },
  attIssuer,
) => {
  const timer = buildManualTimer(t.log, 0n, 1n);

  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installations.electorate);
  // t.log({ electorateCreatorFacet, electorateInstance });

  const main = harden([
    {
      name: CreditTerms.CollateralPrice,
      type: ParamType.RATIO,
      value: collateralPrice,
    },
    {
      name: CreditTerms.CollateralizationRate,
      type: ParamType.RATIO,
      value: collateralizationRate,
    },
  ]);

  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.runLoC,
      governed: harden({
        terms: { main },
        issuerKeywordRecord: { Attestation: attIssuer },
        privateArgs: { feeMintAccess },
      }),
    },
    harden({ electorateCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  /** @type {ERef<StartLineOfCredit['publicFacet']>} */
  const publicFacet = E(zoe).getPublicFacet(governedInstance);

  return { publicFacet };
};

/**
 * @param { Rational } price
 * @param { Object } detail
 * @param { number } detail.testNum
 * @param { string } detail.description
 * @param {{ before: Rational, after?: Rational}} detail.collateralizationRatio
 * @param {{ before: bigint, delta: bigint, after: bigint}} detail.borrowed
 * @param { bigint } detail.staked
 * @param {{ before: bigint, delta: bigint, after: bigint}} detail.liened
 * @param { boolean } [detail.failAttestation]
 * @param { boolean } [detail.failOffer]
 * @param { (faker: StartFaker['publicFacet'], bldBrand: Brand) => Promise<[Amount, Payment]> } [mockAttestation]
 * @typedef {ReturnType<typeof import('./attestationFaker.js').start>} StartFaker
 * @typedef { [bigint, bigint] } Rational
 */
const testLoC = (
  price,
  {
    testNum,
    description,
    collateralizationRatio,
    borrowed,
    staked,
    liened,
    failAttestation,
    failOffer,
  },
  mockAttestation = undefined,
) => {
  if (borrowed.after !== 0n && (liened.delta < 0 || borrowed.before !== 0n)) {
    test.skip(`${testNum} ${description} @@TODO`, _ => {});
    return;
  }

  test(`${testNum} ${description}`, async t => {
    // Genesis: start Zoe etc.
    const {
      zoe,
      feeMintAccess,
      installations,
      runBrand,
      getJig,
    } = await genesis(t);
    t.true(!!zoe);
    t.true(!!feeMintAccess);

    // start attestation contract
    const {
      brands: { BLD: bldBrand, Attestation: attBrand },
      issuers: { Attestation: attIssuer },
      creatorFacet: attestationCreator,
    } = await startAttestation(installations.attestation, zoe);
    const account = { total: staked + 100n, bonded: staked, locked: 0n };
    E(attestationCreator).addAuthority(
      makeStakeReporter(bldBrand, 'address1', account),
    );

    // start RUN LoC
    const collateralPrice = makeRatio(price[0], runBrand, price[1], bldBrand);
    const rate = collateralizationRatio.before;
    const collateralizationRate = makeRatio(rate[0], runBrand, rate[1]);
    const { publicFacet } = await startGovernedLoC(
      t,
      zoe,
      feeMintAccess,
      installations,
      { collateralPrice, collateralizationRate },
      attIssuer,
    );

    /** @type {{ runBrand: Brand, runIssuer: Issuer }} */
    const { runIssuer } = getJig();
    /** @param { bigint } value */
    const run = value => AmountMath.make(runBrand, value);
    /** @param { bigint } value */
    const ubld = value => AmountMath.make(bldBrand, value);

    // Get an attestation (amount, payment)
    const addr = 'address1';
    const attMaker = await E(attestationCreator).getAttMaker(addr);
    const expiration = 61n;

    // @ts-ignore governance wrapper obscures publicFace type :-/
    const lineOfCreditInvitation = await E(publicFacet).makeLoanInvitation();

    /**
     * @param {bigint} bldValue
     * @param {bigint} runValue
     */
    const testOpen = async (bldValue, runValue) => {
      const tryAttestations = E(attMaker).makeAttestations(
        ubld(bldValue),
        expiration,
      );
      if (failAttestation) {
        await t.throwsAsync(tryAttestations);
        return undefined;
      }
      /** @returns { Promise<[Amount, Payment]> } */
      const getReturnableAttestation = () =>
        E.get(tryAttestations).returnable.then(pmt =>
          E(attIssuer)
            .getAmountOf(pmt)
            .then(amt => [amt, pmt]),
        );
      const [attAmt, attPmt] = await (mockAttestation
        ? mockAttestation(
            (await E(zoe).startInstance(installations.faker)).publicFacet,
            bldBrand,
          )
        : getReturnableAttestation());
      // t.log({ attPmt });

      // Offer the attestation in exchange for RUN
      t.log({
        give: { Attestation: attAmt },
        want: { RUN: run(runValue) },
        collateralPrice,
        collateralizationRate,
      });

      const seat = await E(zoe).offer(
        lineOfCreditInvitation,
        harden({
          give: { Attestation: attAmt },
          want: { RUN: run(runValue) },
        }),
        harden({ Attestation: attPmt }),
      );
      const result = E(seat).getOfferResult();
      if (failOffer) {
        await t.throwsAsync(result);
        return undefined;
      }
      const resultValue = await result;
      t.deepEqual(keys(resultValue), [
        'invitationMakers',
        'uiNotifier',
        'vault',
      ]);

      const p = await allValues(await E(seat).getPayouts());
      t.deepEqual(Object.keys(p), ['Attestation', 'RUN']);
      t.deepEqual(await E(runIssuer).getAmountOf(p.RUN), run(runValue));

      return { resultValue, payouts: p };
    };

    /** @param { Unpromise<ReturnType<typeof testOpen>> } step1 */
    const testClose = async step1 => {
      assert(step1);
      const {
        resultValue: { invitationMakers },
        payouts,
      } = step1;
      const closeInvitation = await invitationMakers.CloseVault();
      const seat = await E(zoe).offer(
        closeInvitation,
        harden({
          give: { RUN: run(-borrowed.delta) },
          want: {
            Attestation: AmountMath.makeEmpty(attBrand, AssetKind.SET),
          },
        }),
        harden({ RUN: payouts.RUN }),
      );
      const closeResult = await E(seat).getOfferResult();
      t.log({ closeResult });
      const attBack = await E(seat).getPayout('Attestation');
      const amt = await E(attIssuer).getAmountOf(attBack);
      t.deepEqual(amt, {
        brand: attBrand,
        value: [
          {
            address: 'address1',
            amountLiened: { brand: bldBrand, value: liened.before },
          },
        ],
      });
    };

    if (borrowed.before === 0n) {
      t.is(liened.before, 0n, 'no previous line of credit');
      await testOpen(liened.delta, borrowed.delta);
    } else {
      const step1 = await testOpen(liened.before, borrowed.before);

      if (borrowed.after === 0n) {
        await testClose(step1);
      } else {
        t.is(borrowed.after, 0n, 'only close implemented. TODO@@');
      }
    }
  });
};

test('parse test data from spreadsheet', async t => {
  const rows = testCases.ROWS;
  t.deepEqual(rows[0].slice(0, 4), ['', '', '', '']);
  t.deepEqual(rows[1].slice(0, 2), ['Collateralization Ratio', '500%']);
  t.deepEqual(rows[7].slice(0, 4), ['', '', '1', 'Starting LoC']);
});

const makeTestCases = () => {
  const rows = testCases.ROWS;

  /** @type {(s: string) => Rational} */
  const pct = s => [BigInt(s.replace(/[%$.]/g, '')), 100n];
  /** @param { string } label */
  const lookup = label =>
    (rows.find(row => row[0] === label) ||
      assert.fail(X`${label} not found`))[1];
  const price = pct(lookup('BLD Price'));

  rows.forEach(
    ([
      _a,
      _b,
      testNum,
      description,
      _action,
      _runPerBld,
      rateBefore,
      rateAfter,
      runBefore,
      runDelta,
      runAfter,
      staked,
      lienedBefore,
      lienedDelta,
      lienedAfter,
    ]) => {
      if (!staked || !staked.match(/^[0-9]+$/)) return;

      testLoC(price, {
        testNum: Number.parseFloat(testNum),
        description,
        collateralizationRatio: {
          before: pct(rateBefore),
          after: rateAfter.length > 0 ? pct(rateAfter) : undefined,
        },
        borrowed: {
          before: BigInt(runBefore),
          delta: BigInt(runDelta),
          after: BigInt(runAfter),
        },
        staked: BigInt(staked),
        liened: {
          before: BigInt(lienedBefore),
          delta: BigInt(lienedDelta),
          after: BigInt(lienedAfter),
        },
        failOffer: !!description.match(/FAIL/),
      });
    },
  );
};
makeTestCases();

testLoC([125n, 100n], {
  testNum: 0.1,
  description: 'borrow 100 RUN against 6000 BLD at 1.25, 5x',
  borrowed: { before: 0n, delta: 100n, after: 100n },
  staked: 10_000n,
  liened: { before: 0n, delta: 6000n, after: 6000n },
  collateralizationRatio: { before: [5n, 1n] },
});

testLoC([125n, 100n], {
  testNum: 0.2,
  description: 'borrow 151 RUN against 600 BLD at 1.25, 5x',
  borrowed: { before: 0n, delta: 151n, after: 151n },
  liened: { before: 0n, delta: 600n, after: 600n },
  staked: 9_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failOffer: true,
});

testLoC([15n, 100n], {
  testNum: 0.3,
  description: 'borrow 100 RUN against 600 BLD at 0.15, 5x',
  borrowed: { before: 0n, delta: 100n, after: 0n },
  liened: { before: 0n, delta: 600n, after: 600n },
  staked: 9_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failOffer: true,
});

testLoC([125n, 100n], {
  testNum: 0.4,
  description: 'borrow against 6000 BLD without enough staked',
  borrowed: { before: 0n, delta: 100n, after: 0n },
  liened: { before: 0n, delta: 6000n, after: 0n },
  staked: 5_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failAttestation: true,
});

/**
 * @param { StartFaker['publicFacet'] } faker
 * @param { Brand } bldBrand
 * @returns { Promise<[Amount, Payment]> }
 */
const forgeAttestation = async (faker, bldBrand) => {
  const address = 'address1';
  const amountLiened = AmountMath.make(bldBrand, 60_000n);
  return E(faker).fakeAttestation(address, amountLiened);
};

testLoC(
  [125n, 100n],
  {
    testNum: 0.5,
    description: 'forged attestation does not work',
    borrowed: { before: 0n, delta: 100n, after: 0n },
    liened: { before: 0n, delta: 6000n, after: 0n },
    staked: 5_000n,
    collateralizationRatio: { before: [5n, 1n] },
    failOffer: true,
  },
  forgeAttestation,
);
