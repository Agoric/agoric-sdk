import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeNodeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { startInterchainPool } from '../src/proposals/econ-behaviors.js';
import { setupAmmServices } from './amm/vpool-xyk-amm/setup.js';
import { setUpZoeForTest } from './supports.js';

/** @template T @typedef {import('@endo/promise-kit').PromiseKit<T>} PromiseKit */

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const contractRoots = {
  interchainPool: './src/interchainPool.js',
};

const makeTestContext = async () => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const farZoeKit = await setUpZoeForTest();
  const { zoe } = farZoeKit;

  const istKit = makeIssuerKit('IST');

  const install = (src, dest) =>
    bundleCache.load(src, dest).then(b => E(zoe).install(b));
  const installation = {
    interchainPool: install(contractRoots.interchainPool, 'interchainPool'),
  };

  return {
    bundleCache,
    zoe: await zoe,
    farZoeKit,
    istKit,
    installation,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

const { keys } = Object;

test('make interchain pool', async t => {
  const { make, add } = AmountMath;
  const { farZoeKit, istKit, installation, zoe } = t.context;

  const minimumCentral = make(istKit.brand, 1000n * 1_000_000n);

  // Start AMM
  const {
    amm: { ammPublicFacet: ammPub },
    space,
  } = await setupAmmServices(t, undefined, istKit, undefined, farZoeKit);

  const bootstrap = async () => {
    // Mock VBANK / BankManager
    /** @type {PromiseKit<{ mint: ERef<Mint>, issuer: ERef<Issuer>, brand: Brand}>} */
    const ibcKitP = makePromiseKit();

    /** @type {BankManager} */
    const bankManager = Far('mock BankManager', {
      getAssetSubscription: () => assert.fail('not impl'),
      getModuleAccountAddress: () => assert.fail('not impl'),
      getRewardDistributorDepositFacet: () => assert.fail('not impl'),
      addAsset: async (denom, keyword, proposedName, kit) => {
        t.log('addAsset', { denom, keyword, issuer: `${kit.issuer}` });
        t.truthy(kit.mint);
        ibcKitP.resolve({ ...kit, mint: kit.mint || assert.fail() });
      },
      getBankForAddress: () => assert.fail('not impl'),
    });

    space.produce.bankManager.resolve(bankManager);
    // space.installation.produce.interchainPool.reset();
    space.installation.produce.interchainPool.resolve(
      installation.interchainPool,
    );

    // Start the contract
    await startInterchainPool(space);
    const agoricNames = space.consume.agoricNames;
    const instance = await E(agoricNames).lookup('instance', 'interchainPool');
    const publicFacet = E(zoe).getPublicFacet(instance);

    const makeVPurse = value =>
      ibcKitP.promise.then(async ({ issuer, mint, brand }) => {
        const amt = make(brand, value);
        const purse = E(issuer).makeEmptyPurse();
        const pmt = await E(mint).mintPayment(amt);
        await E(purse).deposit(pmt);
        return purse;
      });
    return { publicFacet, makeVPurse };
  };
  const { publicFacet, makeVPurse } = await bootstrap();

  const checkPayouts = async (seat, amts, issuers) => {
    const actualPayouts = await E(seat).getPayouts();
    t.log({ seat, actualPayouts });
    t.deepEqual(keys(actualPayouts).sort(), keys(amts).sort());
    for (const kw of keys(amts)) {
      // eslint-disable-next-line no-await-in-loop
      const pmt = await actualPayouts[kw];
      // eslint-disable-next-line no-await-in-loop
      const actual = await E(issuers[kw]).getAmountOf(pmt);
      t.deepEqual(actual, amts[kw], `amount mismatch for ${kw}`);
    }
  };

  const moneyPants = async purses => {
    const denom = 'ibc/123';
    const inv1 = await E(publicFacet).makeInterchainPoolInvitation();
    const proposal1 = harden({
      give: { Central: add(minimumCentral, make(istKit.brand, 500n)) },
    });
    const centralPmt = await E(purses.ist).withdraw(proposal1.give.Central);

    const seat1 = await E(zoe).offer(
      inv1,
      proposal1,
      harden({ Central: centralPmt }),
      harden({ denom }),
    );
    const { invitation: inv2, issuer: ibcIssuer } = await E(
      seat1,
    ).getOfferResult();
    const ibcBrand = await E(ibcIssuer).getBrand();

    const proposal2 = harden({
      give: { Secondary: make(ibcBrand, 100n) },
    });
    const pmt2 = await E(purses.ibc).withdraw(proposal2.give.Secondary);
    const seat2 = await E(zoe).offer(
      inv2,
      proposal2,
      harden({ Secondary: pmt2 }),
    );
    t.deepEqual(await E(seat2).getOfferResult(), 'Added liquidity.');

    const liquidityIssuer = await E(ammPub).getLiquidityIssuer(ibcBrand);
    const liqBrand = await E(liquidityIssuer).getBrand();

    await checkPayouts(
      seat1,
      { Central: make(istKit.brand, 0n) },
      { Central: istKit.issuer },
    );

    await checkPayouts(
      seat2,
      {
        Central: make(istKit.brand, 0n),
        Secondary: make(ibcBrand, 0n),
        Liquidity: make(liqBrand, proposal1.give.Central.value - 1000n),
      },
      {
        Central: istKit.issuer,
        Secondary: ibcIssuer,
        Liquidity: liquidityIssuer,
      },
    );
  };

  const istPurse = istKit.issuer.makeEmptyPurse();
  istPurse.deposit(
    istKit.mint.mintPayment(make(istKit.brand, 10_000n * 1_000_000n)),
  );
  await moneyPants({ ist: istPurse, ibc: makeVPurse(1000n) });
});
