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
// import { makeLoopback } from '@agoric/captp';

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
};

test.before(async t => {
  t.log('bundling...', contractRoots);
  const bundles = {
    runLoC: await bundleSource(await asset(contractRoots.runLoC)),
    attestation: await bundleSource(await asset(contractRoots.attestation)),
  };
  t.log(
    'bundled:',
    mapValues(bundles, b => b.endoZipBase64.length),
  );
  assign(t.context, { bundles });
});

const genesis = async () => {
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
  const runBrand = await makeFar(runBrandThere);
  const zoeService = await E(nonFarZoeService).bindDefaultFeePurse(feePurse);
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return { zoe, feeMintAccess, runBrand, getJig: () => testJig };
};

test('RUN mint access', async t => {
  assert.typeof(t.context, 'object');
  assert(t.context);

  const { zoe, feeMintAccess } = await genesis();
  t.true(!!zoe);
  t.true(!!feeMintAccess);
});

const startAttestation = async (t, zoe) => {
  const installation = await E(zoe).install(t.context.bundles.attestation);
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
  const { zoe } = await genesis();

  const a = await startAttestation(t, zoe);
  t.log('attestation start result', a);
  const { brand: bldBrand } = a.bldIssuerKit;
  const ubld = v => AmountMath.make(bldBrand, v);

  a.creatorFacet.addAuthority(
    makeStakeReporter(bldBrand, 'address1', {
      total: 10n,
      bonded: 9n,
      locked: 1n,
    }),
  );

  const attMaker = await E(a.creatorFacet).getAttMaker('address1');
  const expiration = 65n;
  const att = await E(attMaker).makeAttestations(ubld(5n), expiration);
  t.log('attestation', att);
  const pmt = await att.returnable;
  t.log({ pmt });
  t.pass();
});

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
 */
const testLoc = (
  title,
  { account, collateral, runWanted, price, rate, failAttestation, failOffer },
) => {
  test(title, async t => {
    assert.typeof(t.context, 'object');
    assert(t.context);

    const { zoe, feeMintAccess, runBrand, getJig } = await genesis();
    t.true(!!zoe);
    t.true(!!feeMintAccess);
    const a = await startAttestation(t, zoe);
    const { brand: bldBrand } = a.bldIssuerKit;
    a.creatorFacet.addAuthority(
      makeStakeReporter(bldBrand, 'address1', account),
    );
    const { returnable: attIssuer } = await E(a.publicFacet).getIssuers();

    /** @param { bigint } value */
    const run = value => AmountMath.make(runBrand, value);

    const collateralPrice = makeRatio(price[0], runBrand, price[1], bldBrand);
    const collateralizationRate = makeRatio(rate[0], runBrand, rate[1]);
    const installation = await E(zoe).install(t.context.bundles.runLoC);
    /** @type {StartLineOfCredit} */
    const { publicFacet } = await E(zoe).startInstance(
      installation,
      harden({ Attestation: attIssuer }),
      harden({ collateralPrice, collateralizationRate }),
      harden({ feeMintAccess }),
    );
    /** @type {{ runBrand: Brand, runIssuer: Issuer }} */
    const { runIssuer } = getJig();

    const lineOfCreditInvitation = await E(publicFacet).getInvitation();

    /** @param { bigint } v */
    const ubld = v => AmountMath.make(bldBrand, v);

    const addr = 'address1';
    const attMaker = await E(a.creatorFacet).getAttMaker(addr);
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
    const attPmt = await E.get(tryAttestations).returnable;
    t.log({ attPmt });
    const attAmt = await E(attIssuer).getAmountOf(attPmt);

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

    const p = await allValues(await E(seat).getPayouts());
    t.log('payout', p);
    t.deepEqual(await E(runIssuer).getAmountOf(p.RUN), run(runWanted));
  });
};

testLoc('borrow 100 RUN against 6000 BLD at 1.25, 5x', {
  runWanted: 100n,
  collateral: 6000n,
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  price: [125n, 100n],
  rate: [5n, 1n],
});

testLoc('borrow 151 RUN against 600 BLD at 1.25, 5x', {
  runWanted: 151n,
  collateral: 600n,
  price: [125n, 100n],
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  rate: [5n, 1n],
  failOffer: true,
});

testLoc('borrow 100 RUN against 600 BLD at 0.15, 5x', {
  runWanted: 100n,
  collateral: 600n,
  price: [15n, 100n],
  account: { total: 10_000n, bonded: 9_000n, locked: 10n },
  rate: [5n, 1n],
  failOffer: true,
});

testLoc('borrow against 6000 BLD without enough staked', {
  runWanted: 100n,
  collateral: 6000n,
  account: { total: 10_000n, bonded: 5_000n, locked: 10n },
  price: [125n, 100n],
  rate: [5n, 1n],
  failAttestation: true,
});
