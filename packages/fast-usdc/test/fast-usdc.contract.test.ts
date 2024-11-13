import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
import {
  divideBy,
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { commonSetup } from './supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'fast-usdc';
const contractFile = `${dirname}/../src/fast-usdc.contract.js`;
type StartFn = typeof import('../src/fast-usdc.contract.js').start;

test('start', async t => {
  const {
    bootstrap,
    brands: { usdc },
    commonPrivateArgs,
    utils,
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

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

const logAmt = amt => [
  Number(amt.value),
  //   numberWithCommas(Number(amt.value)),
  amt.brand
    .toString()
    .replace(/^\[object Alleged:/, '')
    .replace(/ brand]$/, ''),
];
const scaleAmount = (frac: number, amount: Amount<'nat'>) => {
  const asRatio = parseRatio(frac, amount.brand);
  return multiplyBy(amount, asRatio);
};

test('LP deposits, earns fees, withdraws', async t => {
  const {
    bootstrap,
    brands: { usdc },
    commonPrivateArgs,
    utils,
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

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

  const { add, isGTE, subtract } = AmountMath;

  const { subscriber } = E.get(
    E.get(E(publicFacet).getPublicTopics()).poolMetrics,
  );

  const makeLP = (name, usdcPurse: ERef<Purse>) => {
    const sharePurse = E(terms.issuers.PoolShares).makeEmptyPurse();
    let deposited = AmountMath.makeEmpty(usdc.brand);
    const me = harden({
      deposit: async (qty: bigint) => {
        const {
          value: { shareWorth },
        } = await E(subscriber).getUpdateSince();
        const give = { USDC: usdc.make(qty) };
        const proposal = harden({
          give,
          want: { PoolShare: divideBy(give.USDC, shareWorth) },
        });
        t.log(name, 'deposits', ...logAmt(proposal.give.USDC));
        const toDeposit = await E(publicFacet).makeDepositInvitation();
        const payments = { USDC: await E(usdcPurse).withdraw(give.USDC) };
        const payout = await E(zoe)
          .offer(toDeposit, proposal, payments)
          .then(seat => E(seat).getPayout('PoolShare'))
          .then(pmt => E(sharePurse).deposit(pmt))
          .then(a => a as Amount<'nat'>);
        t.log(name, 'deposit payout', ...logAmt(payout));
        t.true(isGTE(payout, proposal.want.PoolShare));
        deposited = add(deposited, give.USDC);
      },

      withdraw: async (portion: number) => {
        const myShares = await E(sharePurse)
          .getCurrentAmount()
          .then(a => a as Amount<'nat'>);
        const give = { PoolShare: scaleAmount(portion, myShares) };
        const {
          value: { shareWorth },
        } = await E(subscriber).getUpdateSince();
        const myUSDC = multiplyBy(myShares, shareWorth);
        const myFees = subtract(myUSDC, deposited);
        t.log(name, 'sees fees earned', ...logAmt(myFees));
        const proposal = harden({
          give,
          want: { USDC: multiplyBy(give.PoolShare, shareWorth) },
        });
        const pct = portion * 100;
        t.log(name, 'withdraws', pct, '%:', ...logAmt(proposal.give.PoolShare));
        const toWithdraw = await E(publicFacet).makeWithdrawInvitation();
        const usdcPmt = await E(sharePurse)
          .withdraw(proposal.give.PoolShare)
          .then(pmt => E(zoe).offer(toWithdraw, proposal, { PoolShare: pmt }))
          .then(seat => E(seat).getPayout('USDC'));
        const amt = await E(usdcPurse).deposit(usdcPmt);
        t.log(name, 'withdaw payout', ...logAmt(amt));
        t.true(isGTE(amt, proposal.want.USDC));
      },
    });
    return me;
  };

  const purseOf = (value: bigint) =>
    E(terms.issuers.USDC)
      .makeEmptyPurse()
      .then(async p => {
        const pmt = await utils.pourPayment(usdc.make(value));
        await p.deposit(pmt);
        return p;
      });

  const lps = {
    alice: makeLP('Alice', purseOf(60n)),
    bob: makeLP('Bob', purseOf(50n)),
  };

  await Promise.all([lps.alice.deposit(60n), lps.bob.deposit(40n)]);
  {
    const feeAmt = usdc.make(25n);
    t.log('contract accrues some amount of fees:', ...logAmt(feeAmt));
    const feePmt = await utils.pourPayment(feeAmt);
    // @ts-expect-error FIXME
    await E(creatorFacet).simulateFeesFromAdvance(feeAmt, feePmt);
  }

  await Promise.all([lps.alice.withdraw(0.2), lps.bob.withdraw(0.8)]);
});

test('baggage', async t => {
  const {
    brands: { usdc },
    commonPrivateArgs,
  } = await commonSetup(t);

  let contractBaggage;
  const setJig = ({ baggage }) => {
    contractBaggage = baggage;
  };

  const { zoe, bundleAndInstall } = await setUpZoeForTest({ setJig });
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {
      poolFee: usdc.make(1n),
      contractFee: usdc.make(1n),
    },
    commonPrivateArgs,
  );

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
