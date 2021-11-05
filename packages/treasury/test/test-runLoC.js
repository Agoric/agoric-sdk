// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';
import { makeLoopback } from '@agoric/captp';
import { resolve as metaResolve } from 'import-meta-resolve';
import bundleSource from '@agoric/bundle-source';
import { AmountMath } from '@agoric/ertp';
// import { makeLoopback } from '@agoric/captp';

const { assign, entries, fromEntries, keys, values } = Object;

const mapValues = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [p, f(v)]));
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
const allValues = async obj =>
  fromEntries(zip(keys(obj), await Promise.all(values(obj))));

const asset = async ref =>
  new URL(await metaResolve(ref, import.meta.url)).pathname;

const contractRoots = {
  runLoC: '../src/runLoC.js',
};

test.before(async t => {
  t.log('bundling...', contractRoots);
  const bundles = {
    runLoC: await bundleSource(await asset(contractRoots.runLoC)),
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

  const { zoe, feeMintAccess, getJig } = await genesis();
  t.true(!!zoe);
  t.true(!!feeMintAccess);

  const installation = await E(zoe).install(t.context.bundles.runLoC);
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    undefined,
    undefined,
    harden({ feeMintAccess }),
  );
  /** @type {{ runBrand: Brand, runIssuer: Issuer }} */
  const { runBrand, runIssuer } = getJig();
  const lineOfCreditInvitation = await E(publicFacet).getInvitation();

  /** @param { bigint } value */
  const run = value => AmountMath.make(runBrand, value);
  const attAmt = run(0n); // @@TODO
  const attPmt = await E(E(runIssuer).makeEmptyPurse()).withdraw(attAmt); // @@TODO

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
