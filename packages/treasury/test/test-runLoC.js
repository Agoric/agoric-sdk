// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';
import { Far, makeLoopback } from '@agoric/captp';
import { resolve as metaResolve } from 'import-meta-resolve';
import bundleSource from '@agoric/bundle-source';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
// import { makeLoopback } from '@agoric/captp';

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */
/** @typedef {Unpromise<ReturnType<typeof import('@agoric/zoe/src/contracts/attestation/attestation.js').start>>} StartAttestationResult */
/** @typedef {Unpromise<ReturnType<typeof import('../src/runLoC.js').start>>} StartLineOfCredit */

const { assign, entries, fromEntries, keys, values } = Object;
const { details: X } = assert;

const mapValues = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [p, f(v)]));
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
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
  const zoeService = await E(nonFarZoeService).bindDefaultFeePurse(feePurse);
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return { zoe, feeMintAccess, getJig: () => testJig };
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
      returnableAttName: 'BldAttLoc',
    }),
  );
  return { bldIssuerKit, publicFacet, creatorFacet };
};

const chainState = harden({
  currentTime: 10n,
  accounts: {
    address1: {
      total: 500n,
      bonded: 200n,
      locked: 10n,
    },
  },
});

/**
 * @param {Brand} uBrand
 */
const makeStakeReporter = uBrand => {
  const ubld = v => AmountMath.make(uBrand, v);
  return Far('stakeReporter', {
    /**
     * @param { string } address
     * @param { Brand } brand
     */
    getAccountState: (address, brand) => {
      assert(brand === uBrand, X`unexpected brand: ${brand}`);
      const account = chainState.accounts[address];
      assert(account, X`no such account: ${address}`);
      return harden({
        ...mapValues(account, ubld),
        currentTime: chainState.currentTime,
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

  a.creatorFacet.addAuthority(makeStakeReporter(bldBrand));

  const attMaker = await E(a.creatorFacet).getAttMaker(
    keys(chainState.accounts)[0],
  );
  const expiration = chainState.currentTime + 5n;
  const att = await E(attMaker).makeAttestations(ubld(10n), expiration);
  t.log('attestation', att);
  const pmt = await att.returnable;
  t.log({ pmt });
  t.pass();
});

test('take out RUN line of credit', async t => {
  assert.typeof(t.context, 'object');
  assert(t.context);

  const { zoe, feeMintAccess, getJig } = await genesis();
  t.true(!!zoe);
  t.true(!!feeMintAccess);
  const a = await startAttestation(t, zoe);
  const { brand: bldBrand } = a.bldIssuerKit;
  a.creatorFacet.addAuthority(makeStakeReporter(bldBrand));

  const installation = await E(zoe).install(t.context.bundles.runLoC);
  /** @type {StartLineOfCredit} */
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    undefined,
    undefined,
    harden({ feeMintAccess }),
  );
  /** @type {{ runBrand: Brand, runIssuer: Issuer }} */
  const { runBrand } = getJig();
  /** @param { bigint } value */
  const run = value => AmountMath.make(runBrand, value);

  const lineOfCreditInvitation = await E(publicFacet).getInvitation();

  /** @param { bigint } v */
  const ubld = v => AmountMath.make(bldBrand, v);

  const { returnable: attIssuer } = await E(a.publicFacet).getIssuers();
  const addr = keys(chainState.accounts)[0];
  const attMaker = await E(a.creatorFacet).getAttMaker(addr);
  t.log({ addr, attMaker });

  const expiration = chainState.currentTime + 1n;
  const attPmt = await E.get(E(attMaker).makeAttestations(ubld(5n), expiration))
    .returnable;
  t.log({ attPmt });
  const attAmt = await E(attIssuer).getAmountOf(attPmt);

  const seat = await E(zoe).offer(
    lineOfCreditInvitation,
    harden({ give: { Attestation: attAmt }, want: { RUN: run(100n) } }),
    harden({ Attestation: attPmt }),
  );
  const result = await E(seat).getOfferResult();
  t.true(await E(seat).hasExited());
  const p = await allValues(await E(seat).getPayouts());
  t.log('payout', p);
  t.is(result, '@@TODO');
});
