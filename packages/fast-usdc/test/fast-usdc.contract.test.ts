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
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { MockCctpTxEvidences } from './fixtures.js';
import { commonSetup } from './supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../src/fast-usdc.contract.js`;
type StartFn = typeof import('../src/fast-usdc.contract.js').start;

const getInvitationProperties = async (
  zoe: ZoeService,
  invitation: Invitation,
) => {
  const invitationIssuer = E(zoe).getInvitationIssuer();
  const amount = await E(invitationIssuer).getAmountOf(invitation);
  return amount.value[0];
};

const startContract = async (
  common: Pick<
    Awaited<ReturnType<typeof commonSetup>>,
    'brands' | 'commonPrivateArgs'
  >,
) => {
  const {
    brands: { usdc },
    commonPrivateArgs,
  } = common;

  const { zoe, bundleAndInstall } = await setUpZoeForTest({
    setJig: jig => {
      jig.chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);
    },
  });
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const startKit = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {
      poolFee: usdc.make(1n),
      contractFee: usdc.make(1n),
      usdcDenom: 'ibc/usdconagoric',
    },
    commonPrivateArgs,
  );

  return { ...startKit, zoe };
};

// FIXME this makeTestPushInvitation forces evidence, which triggers advancing,
// which doesn't yet work
test.skip('advancing', async t => {
  const common = await commonSetup(t);

  const { publicFacet, zoe } = await startContract(common);

  const e1 = await E(MockCctpTxEvidences.AGORIC_PLUS_DYDX)();

  const inv = await E(publicFacet).makeTestPushInvitation(e1);
  // the invitation maker itself pushes the evidence

  // the offer is still safe to make
  const seat = await E(zoe).offer(inv);
  t.is(
    await E(seat).getOfferResult(),
    'inert; nothing should be expected from this offer',
  );
});

test('oracle operators have closely-held rights to submit evidence of CCTP transactions', async t => {
  const common = await commonSetup(t);
  const { creatorFacet, zoe } = await startContract(common);

  const operatorId = 'operator-1';

  const opInv = await E(creatorFacet).makeOperatorInvitation(operatorId);

  t.like(await getInvitationProperties(zoe, opInv), {
    description: 'oracle operator invitation',
  });

  const operatorKit = await E(E(zoe).offer(opInv)).getOfferResult();

  t.deepEqual(Object.keys(operatorKit), [
    'admin',
    'invitationMakers',
    'operator',
  ]);

  const e1 = MockCctpTxEvidences.AGORIC_NO_PARAMS();

  {
    const inv = await E(operatorKit.invitationMakers).SubmitEvidence(e1);
    const res = await E(E(zoe).offer(inv)).getOfferResult();
    t.is(res, 'inert; nothing should be expected from this offer');
  }

  // what removeOperator will do
  await E(operatorKit.admin).disable();

  await t.throwsAsync(E(operatorKit.invitationMakers).SubmitEvidence(e1), {
    message: 'submitEvidence for disabled operator',
  });
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
  const common = await commonSetup(t);
  const {
    brands: { usdc },
    utils,
  } = common;

  const { instance, creatorFacet, publicFacet, zoe } =
    await startContract(common);
  const terms = await E(zoe).getTerms(instance);

  const { add, isGTE, subtract } = AmountMath;

  const { subscriber } = E.get(
    E.get(E(publicFacet).getPublicTopics()).shareWorth,
  );

  const makeLP = (name, usdcPurse: ERef<Purse>) => {
    const sharePurse = E(terms.issuers.PoolShares).makeEmptyPurse();
    let deposited = AmountMath.makeEmpty(usdc.brand);
    const me = harden({
      deposit: async (qty: bigint) => {
        const { value: shareWorth } = await E(subscriber).getUpdateSince();
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
        const { value: shareWorth } = await E(subscriber).getUpdateSince();
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
      usdcDenom: 'ibc/usdconagoric',
    },
    commonPrivateArgs,
  );

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
