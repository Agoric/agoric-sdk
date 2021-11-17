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
  const bldIssuerKit = makeIssuerKit(
    'BLD',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );

  /** @type {StartAttestationResult} */
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    harden({ Underlying: bldIssuerKit.issuer }),
    harden({
      expiringAttName: 'BldAttGov',
      returnableAttName: 'BldAttLoC',
    }),
  );
  return { bldIssuerKit, publicFacet, creatorFacet };
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
  t.log('attestation start result', a);
  const { brand: bldBrand } = a.bldIssuerKit;
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
  t.log('attestation', att);
  t.truthy(att);
  const pmt = await att.returnable;
  t.log({ pmt });
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
  t.log({ electorateCreatorFacet, electorateInstance });

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
 * @param { string } title
 * @param { Object } detail
 * @param { Account } detail.account
 * @param { bigint } detail.collateral
 * @param { bigint } detail.runWanted
 * @param { [bigint, bigint] } detail.price
 * @param { [bigint, bigint] } detail.rate
 * @param { boolean } [detail.failAttestation]
 * @param { boolean } [detail.failOffer]
 * @param { (faker: StartFaker['publicFacet'], bldBrand: Brand) => Promise<[Amount, Payment]> } [mockAttestation]
 * @typedef {ReturnType<typeof import('./attestationFaker.js').start>} StartFaker
 */
const testLoC = (
  title,
  { account, collateral, runWanted, price, rate, failAttestation, failOffer },
  mockAttestation = undefined,
) => {
  test(title, async t => {
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
    const { publicFacet: faker } = await E(zoe).startInstance(
      installations.faker,
    );
    const attest = await startAttestation(installations.attestation, zoe);
    const { brand: bldBrand } = attest.bldIssuerKit;
    attest.creatorFacet.addAuthority(
      makeStakeReporter(bldBrand, 'address1', account),
    );
    const { returnable: attIssuer } = await E(attest.publicFacet).getIssuers();

    // start RUN LoC
    const collateralPrice = makeRatio(price[0], runBrand, price[1], bldBrand);
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

    // @ts-ignore governance wrapper obscures publicFace type :-/
    const lineOfCreditInvitation = await E(publicFacet).getInvitation();

    // Get an attestation (amount, payment)
    const addr = 'address1';
    const attMaker = await E(attest.creatorFacet).getAttMaker(addr);
    t.log({ addr, attMaker });

    const expiration = 61n;
    const tryAttestations = E(attMaker).makeAttestations(
      ubld(collateral),
      expiration,
    );
    if (failAttestation) {
      await t.throwsAsync(tryAttestations);
      return;
    }
    /** @returns { Promise<[Amount, Payment]> } */
    const getReturnableAttestation = async () =>
      E.get(tryAttestations).returnable.then(pmt =>
        E(attIssuer)
          .getAmountOf(pmt)
          .then(amt => [amt, pmt]),
      );
    const [attAmt, attPmt] = await (mockAttestation
      ? mockAttestation(faker, bldBrand)
      : getReturnableAttestation());
    t.log({ attPmt });

    // Offer the attestation in exchange for RUN
    t.log({
      give: { Attestation: attAmt },
      want: { RUN: run(runWanted) },
      collateralPrice,
      collateralizationRate,
    });

    const seat = await E(zoe).offer(
      lineOfCreditInvitation,
      harden({ give: { Attestation: attAmt }, want: { RUN: run(runWanted) } }),
      harden({ Attestation: attPmt }),
    );
    const result = E(seat).getOfferResult();
    if (failOffer) {
      await t.throwsAsync(result);
      return;
    }
    const resultValue = await result;
    t.log({ resultValue });
    t.regex(resultValue, /^borrowed /);

    t.true(await E(seat).hasExited());

    // attPmt is spent
    t.throwsAsync(E(attIssuer).getAmountOf(attPmt));

    const p = await allValues(await E(seat).getPayouts());
    t.log('payout', p);
    t.deepEqual(await E(runIssuer).getAmountOf(p.RUN), run(runWanted));
  });
};

testLoC('borrow 100 RUN against 6000 BLD at 1.25, 5x', {
  runWanted: 100n,
  collateral: 6000n,
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  price: [125n, 100n],
  rate: [5n, 1n],
});

testLoC('borrow 151 RUN against 600 BLD at 1.25, 5x', {
  runWanted: 151n,
  collateral: 600n,
  price: [125n, 100n],
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  rate: [5n, 1n],
  failOffer: true,
});

testLoC('borrow 100 RUN against 600 BLD at 0.15, 5x', {
  runWanted: 100n,
  collateral: 600n,
  price: [15n, 100n],
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  rate: [5n, 1n],
  failOffer: true,
});

testLoC('borrow against 6000 BLD without enough staked', {
  runWanted: 100n,
  collateral: 6000n,
  account: { total: 10_000n, bonded: 5_000n, locked: 10n },
  price: [125n, 100n],
  rate: [5n, 1n],
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
  'forge an attestation',
  {
    runWanted: 100n,
    collateral: 6000n,
    account: { total: 10_000n, bonded: 5_000n, locked: 10n },
    price: [125n, 100n],
    rate: [5n, 1n],
    failOffer: true,
  },
  forgeAttestation,
);
