import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { TestFn } from 'ava';
import { commonSetup } from './supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'fast-usdc';
const contractFile = `${dirname}/../src/fast-usdc.contract.js`;
type StartFn = typeof import('../src/fast-usdc.contract.js').start;

const makeTestContext = async () => {
  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  return { bundleCache };
};
const test: TestFn<Awaited<ReturnType<typeof makeTestContext>>> = anyTest;

test.before('cache bundles', async t => (t.context = await makeTestContext()));

test('start', async t => {
  const {
    bootstrap,
    brands: { usdc },
    commonPrivateArgs,
    utils,
  } = await commonSetup(t);

  const { zoe } = await setUpZoeForTest();
  const bundle = await t.context.bundleCache.load(contractFile, contractName);
  const installation: Installation<StartFn> = await E(zoe).install(bundle);

  const { creatorFacet } = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {
      poolFee: usdc.make(1n),
      contractFee: usdc.make(1n),
    },
    commonPrivateArgs,
  );
  t.truthy(creatorFacet);
});

test('LP deposit, withdraw', async t => {
  const {
    bootstrap,
    brands: { usdc },
    commonPrivateArgs,
    utils,
  } = await commonSetup(t);

  const { zoe } = await setUpZoeForTest();
  const bundle = await t.context.bundleCache.load(contractFile, contractName);
  const installation: Installation<StartFn> = await E(zoe).install(bundle);

  const { creatorFacet, publicFacet, instance } = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {
      poolFee: usdc.make(1n),
      contractFee: usdc.make(1n),
    },
    commonPrivateArgs,
  );
  t.truthy(creatorFacet);
  const terms = await E(zoe).getTerms(instance);
  const { PoolShares } = terms.brands;
  const sharePurseP = E(terms.issuers.PoolShares).makeEmptyPurse();
  const usdcPurseP = E(terms.issuers.USDC).makeEmptyPurse();

  const { make, isGTE } = AmountMath;

  {
    const proposal = harden({
      give: { USDC: usdc.make(100n) },
      want: { PoolShare: make(PoolShares, 20n) },
    });
    t.log('deposit', proposal.give.USDC);
    const toDeposit = await E(publicFacet).makeDepositInvitation();
    const payments = { USDC: utils.pourPayment(proposal.give.USDC) };
    const dSeat = await E(zoe).offer(toDeposit, proposal, payments);
    const sharePmt = await E(dSeat).getPayout('PoolShare');
    const amt = await E(sharePurseP).deposit(sharePmt);
    t.log('deposit payout', amt);
    t.true(isGTE(amt, proposal.want.PoolShare));
  }

  {
    const feeAmt = usdc.make(25n);
    const feePmt = await utils.pourPayment(feeAmt);
    await E(creatorFacet).simulateFeesFromAdvance(feeAmt, feePmt);
  }

  {
    const proposal = harden({
      give: { PoolShare: make(PoolShares, 40n) },
      want: { USDC: usdc.make(50n) },
    });
    t.log('withdraw', proposal.give.PoolShare);
    const toWithdraw = await E(publicFacet).makeWithdrawInvitation();
    const pmt = await E(sharePurseP).withdraw(proposal.give.PoolShare);
    const dSeat = await E(zoe).offer(toWithdraw, proposal, {
      PoolShare: pmt,
    });
    const usdcPmt = await E(dSeat).getPayout('USDC');
    const amt = await E(usdcPurseP).deposit(usdcPmt);
    t.log('withdaw payout', amt);
    t.true(isGTE(amt, proposal.want.USDC));
  }
});
