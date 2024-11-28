import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import {
  eventLoopIteration,
  inspectMapStore,
} from '@agoric/internal/src/testing-utils.js';
import {
  makePublishKit,
  observeIteration,
  subscribeEach,
  type Subscriber,
} from '@agoric/notifier';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { heapVowE as VE } from '@agoric/vow/vat.js';
import {
  divideBy,
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { matches, objectMap } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';
import path from 'path';
import type { OperatorKit } from '../src/exos/operator-kit.js';
import type { FastUsdcSF } from '../src/fast-usdc.contract.js';
import { PoolMetricsShape } from '../src/type-guards.js';
import type { CctpTxEvidence, FeeConfig, PoolMetrics } from '../src/types.js';
import { addressTools } from '../src/utils/address.js';
import { makeFeeTools } from '../src/utils/fees.js';
import { MockCctpTxEvidences } from './fixtures.js';
import { commonSetup, uusdcOnAgoric } from './supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../src/fast-usdc.contract.js`;

const agToNoble = fetchedChainInfo.agoric.connections['noble-1'];

const { add, isGTE, make, subtract, min } = AmountMath;

const getInvitationProperties = async (
  zoe: ZoeService,
  invitation: Invitation,
) => {
  const invitationIssuer = E(zoe).getInvitationIssuer();
  const amount = await E(invitationIssuer).getAmountOf(invitation);
  return amount.value[0];
};

type CommonSetup = Awaited<ReturnType<typeof commonSetup>>;
const startContract = async (
  common: Pick<CommonSetup, 'brands' | 'commonPrivateArgs' | 'utils'>,
  operatorQty = 1,
) => {
  const {
    brands: { usdc },
    commonPrivateArgs,
  } = common;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<FastUsdcSF> =
    await bundleAndInstall(contractFile);

  const startKit = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    { usdcDenom: uusdcOnAgoric },
    commonPrivateArgs,
  );

  const terms = await E(zoe).getTerms(startKit.instance);

  const { subscriber: metricsSub } = E.get(
    E.get(E(startKit.publicFacet).getPublicTopics()).poolMetrics,
  );

  const opInvs = await Promise.all(
    [...Array(operatorQty).keys()].map(opIx =>
      E(startKit.creatorFacet).makeOperatorInvitation(`operator-${opIx}`),
    ),
  );

  return {
    ...startKit,
    terms,
    zoe,
    metricsSub,
    invitations: { operator: opInvs },
  };
};

const makeTestContext = async (t: ExecutionContext) => {
  const common = await commonSetup(t);

  const startKit = await startContract(common, 2);

  const { transferBridge } = common.mocks;
  const evm = makeEVM();

  const { inspectBankBridge, inspectLocalBridge } = common.utils;
  const snapshot = () => ({
    bank: inspectBankBridge().length,
    local: inspectLocalBridge().length,
  });
  const since = ix => ({
    bank: inspectBankBridge().slice(ix.bank),
    local: inspectLocalBridge().slice(ix.local),
  });

  const sync = {
    ocw: makePromiseKit<Awaited<ReturnType<typeof makeOracleOperator>>[]>(),
    lp: makePromiseKit<Record<string, ReturnType<typeof makeLP>>>(),
  };

  const { brands, utils } = common;
  const { bankManager } = common.bootstrap;
  const receiveUSDCAt = async (addr: string, amount: NatValue) => {
    const pmt = await utils.pourPayment(make(brands.usdc.brand, amount));
    const purse = E(E(bankManager).getBankForAddress(addr)).getPurse(
      brands.usdc.brand,
    );
    return E(purse).deposit(pmt);
  };

  const mint = async (e: CctpTxEvidence) => {
    const settlerAddr = 'agoric1fakeLCAAddress1'; // TODO: get from contract
    const rxd = await receiveUSDCAt(settlerAddr, e.tx.amount);
    await VE(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: e.aux.recipientAddress,
        target: settlerAddr,
        sourceChannel: agToNoble.transferChannel.counterPartyChannelId,
        denom: 'uusdc',
        amount: e.tx.amount,
        sender: e.tx.forwardingAddress,
      }),
    );
    await eventLoopIteration(); // let settler do work
    return rxd;
  };

  return { bridges: { snapshot, since }, common, evm, mint, startKit, sync };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;
test.before(async t => (t.context = await makeTestContext(t)));

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
  const installation: Installation<FastUsdcSF> =
    await bundleAndInstall(contractFile);

  await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    { usdcDenom: uusdcOnAgoric },
    commonPrivateArgs,
  );

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});

const purseOf =
  (issuer: Issuer, { pourPayment }) =>
  async (value: bigint) => {
    const brand = await E(issuer).getBrand();
    const purse = E(issuer).makeEmptyPurse();
    const pmt = await pourPayment(make(brand, value));
    await E(purse).deposit(pmt);
    return purse;
  };

const makeOracleOperator = async (
  opInv: Invitation<OperatorKit>,
  txSubscriber: Subscriber<CctpTxEvidence>,
  zoe: ZoeService,
  t: ExecutionContext,
) => {
  let done = 0;
  const failures = [] as any[];
  t.like(await getInvitationProperties(zoe, opInv), {
    description: 'oracle operator invitation',
  });

  // operator only gets `.invitationMakers`
  // but for testing, we need `.admin` too. UNTIL #?????
  const operatorKit = await E(E(zoe).offer(opInv)).getOfferResult();
  t.deepEqual(Object.keys(operatorKit), [
    'admin',
    'invitationMakers',
    'operator',
  ]);
  const { invitationMakers } = operatorKit;

  return harden({
    watch: () => {
      void observeIteration(subscribeEach(txSubscriber), {
        updateState: tx =>
          // KLUDGE: tx wouldn't include aux. OCW looks it up
          E.when(
            E(invitationMakers).SubmitEvidence(tx),
            inv =>
              E.when(E(E(zoe).offer(inv)).getOfferResult(), res => {
                t.is(res, 'inert; nothing should be expected from this offer');
                done += 1;
              }),
            reason => {
              failures.push(reason.message);
            },
          ),
      });
    },
    getDone: () => done,
    getFailures: () => harden([...failures]),
    // operator only gets .invitationMakers
    getKit: () => operatorKit,
  });
};

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

const makeLP = async (
  name: string,
  usdcPurse: ERef<Purse>,
  zoe: ZoeService,
  instance: Instance<FastUsdcSF>,
) => {
  const publicFacet = E(zoe).getPublicFacet(instance);
  const { subscriber } = E.get(
    E.get(E(publicFacet).getPublicTopics()).poolMetrics,
  );
  const terms = await E(zoe).getTerms(instance);
  const { USDC } = terms.brands;
  const sharePurse = E(terms.issuers.PoolShares).makeEmptyPurse();
  let investment = AmountMath.makeEmpty(USDC);
  const me = harden({
    deposit: async (t: ExecutionContext, qty: bigint) => {
      const {
        value: { shareWorth },
      } = await E(subscriber).getUpdateSince();
      const give = { USDC: make(USDC, qty) };
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
      investment = add(investment, give.USDC);
    },

    withdraw: async (t: ExecutionContext, portion: number) => {
      const myShares = await E(sharePurse)
        .getCurrentAmount()
        .then(a => a as Amount<'nat'>);
      const give = { PoolShare: scaleAmount(portion, myShares) };
      const {
        value: { shareWorth },
      } = await E(subscriber).getUpdateSince();
      const myUSDC = multiplyBy(myShares, shareWorth);
      const myFees = subtract(myUSDC, investment);
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
      t.log(name, 'withdraw payout', ...logAmt(amt));
      t.true(isGTE(amt, proposal.want.USDC));
      // min() in case things changed between checking metrics and withdrawing
      investment = subtract(investment, min(amt, investment));
      return amt;
    },
  });
  return me;
};

test.skip('LP borrow - TODO: move to exo test', async t => {
  const common = await commonSetup(t);
  const {
    brands: { usdc },
    utils,
  } = common;

  const { instance, creatorFacet, zoe, metricsSub, terms } =
    await startContract(common);

  const usdcPurse = purseOf(terms.issuers.USDC, utils);
  const lps = {
    alice: makeLP('Alice', usdcPurse(100n), zoe, instance),
  };
  // seed pool with funds
  await E(lps.alice).deposit(t, 100n);

  const { value } = await E(metricsSub).getUpdateSince();
  const { shareWorth, encumberedBalance } = value;
  const poolSeatAllocation = subtract(
    subtract(shareWorth.numerator, encumberedBalance),
    usdc.make(1n),
  );
  t.log('Attempting to borrow entire pool seat allocation', poolSeatAllocation);
  await t.throwsAsync(
    E(creatorFacet).testBorrow({ USDC: poolSeatAllocation }),
    {
      message: /Cannot borrow/,
    },
    'borrow fails when requested equals pool seat allocation',
  );

  await t.throwsAsync(
    E(creatorFacet).testBorrow({ USDC: usdc.make(200n) }),
    {
      message: /Cannot borrow/,
    },
    'borrow fails when requested exceeds pool seat allocation',
  );

  await t.throwsAsync(E(creatorFacet).testBorrow({ USDC: usdc.make(0n) }), {
    message: /arg 1: USDC: value: "\[0n\]" - Must be >= "\[1n\]"/,
  });

  await t.throwsAsync(
    E(creatorFacet).testBorrow(
      // @ts-expect-error intentionally incorrect KW
      { Fee: usdc.make(1n) },
    ),
    {
      message: /Must have missing properties \["USDC"\]/,
    },
  );

  // LPs can still withdraw (contract did not shutdown)
  await E(lps.alice).withdraw(t, 0.5);

  const amt = await E(creatorFacet).testBorrow({ USDC: usdc.make(30n) });
  t.deepEqual(amt, { USDC: usdc.make(30n) }, 'borrow succeeds');

  await eventLoopIteration();
  t.like(await E(metricsSub).getUpdateSince(), {
    value: {
      encumberedBalance: {
        value: 30n,
      },
      totalBorrows: {
        value: 30n,
      },
      totalRepays: {
        value: 0n,
      },
    },
  });
});

test.skip('LP repay - TODO: move to exo test', async t => {
  const common = await commonSetup(t);
  const {
    commonPrivateArgs,
    brands: { usdc },
    utils,
  } = common;

  const { instance, creatorFacet, zoe, metricsSub, terms } =
    await startContract(common);
  const usdcPurse = purseOf(terms.issuers.USDC, utils);
  const lps = {
    alice: makeLP('Alice', usdcPurse(100n), zoe, instance),
  };
  // seed pool with funds
  await E(lps.alice).deposit(t, 100n);

  // borrow funds from pool to increase encumbered balance
  await E(creatorFacet).testBorrow({ USDC: usdc.make(50n) });
  const feeTools = makeFeeTools(commonPrivateArgs.feeConfig);
  {
    t.log('cannot repay more than encumbered balance');
    const repayAmounts = feeTools.calculateSplit(usdc.make(100n));
    const repayPayments = await deeplyFulfilledObject(
      objectMap(repayAmounts, utils.pourPayment),
    );
    await t.throwsAsync(
      E(creatorFacet).testRepay(repayAmounts, repayPayments),
      {
        message: /Cannot repay. Principal .* exceeds encumberedBalance/,
      },
    );
  }

  {
    const pmt = utils.pourPayment(usdc.make(50n));
    await t.throwsAsync(
      E(creatorFacet).testRepay(
        // @ts-expect-error intentionally incorrect KWR
        { USDC: usdc.make(50n) },
        { USDC: pmt },
      ),
      {
        message:
          /Must have missing properties \["Principal","PoolFee","ContractFee"\]/,
      },
    );
  }
  {
    const pmt = utils.pourPayment(usdc.make(50n));
    await t.throwsAsync(
      E(creatorFacet).testRepay(
        // @ts-expect-error intentionally incorrect KWR
        { Principal: usdc.make(50n) },
        { Principal: pmt },
      ),
      {
        message: /Must have missing properties \["PoolFee","ContractFee"\]/,
      },
    );
  }
  {
    const amts = {
      Principal: usdc.make(0n),
      ContractFee: usdc.make(0n),
      PoolFee: usdc.make(0n),
    };
    const pmts = await deeplyFulfilledObject(
      objectMap(amts, utils.pourPayment),
    );
    await t.throwsAsync(E(creatorFacet).testRepay(amts, pmts), {
      message: /arg 1: Principal: value: "\[0n\]" - Must be >= "\[1n\]"/,
    });
  }

  {
    t.log('repay fails when amounts do not match seat allocation');
    const amts = {
      Principal: usdc.make(25n),
      ContractFee: usdc.make(1n),
      PoolFee: usdc.make(2n),
    };
    const pmts = await deeplyFulfilledObject(
      harden({
        Principal: utils.pourPayment(usdc.make(24n)),
        ContractFee: utils.pourPayment(usdc.make(1n)),
        PoolFee: utils.pourPayment(usdc.make(2n)),
      }),
    );
    await t.throwsAsync(E(creatorFacet).testRepay(amts, pmts), {
      message: /Cannot repay. From seat allocation .* does not equal amounts/,
    });
  }

  {
    t.log('repay succeeds with no Pool or Contract Fee');
    const amts = {
      Principal: usdc.make(25n),
      ContractFee: usdc.make(0n),
      PoolFee: usdc.make(0n),
    };
    const pmts = await deeplyFulfilledObject(
      objectMap(amts, utils.pourPayment),
    );
    const repayResult = await E(creatorFacet).testRepay(amts, pmts);

    for (const r of Object.values(repayResult)) {
      t.is(r.value, 0n, 'testRepay consumes all payments');
    }
  }

  const amts = {
    Principal: usdc.make(25n),
    ContractFee: usdc.make(1n),
    PoolFee: usdc.make(2n),
  };
  const pmts = await deeplyFulfilledObject(objectMap(amts, utils.pourPayment));
  const repayResult = await E(creatorFacet).testRepay(amts, pmts);

  for (const r of Object.values(repayResult)) {
    t.is(r.value, 0n, 'testRepay consumes all payments');
  }

  await eventLoopIteration();
  t.like(await E(metricsSub).getUpdateSince(), {
    value: {
      encumberedBalance: {
        value: 0n,
      },
      totalBorrows: {
        value: 50n,
      },
      totalRepays: {
        value: 50n,
      },
      totalContractFees: {
        value: 1n,
      },
      totalPoolFees: {
        value: 2n,
      },
      shareWorth: {
        numerator: {
          value: 103n, // 100n (alice lp) + 1n (dust) + 2n (pool fees)
        },
      },
    },
  });

  // LPs can still withdraw (contract did not shutdown)
  await E(lps.alice).withdraw(t, 1);
});

const makeEVM = (template = MockCctpTxEvidences.AGORIC_PLUS_OSMO()) => {
  const [settleAddr] = template.aux.recipientAddress.split('?');
  let nonce = 0;

  const makeTx = (amount: bigint, recipientAddress: string): CctpTxEvidence => {
    nonce += 1;

    const tx: CctpTxEvidence = harden({
      ...template,
      txHash: `0x00000${nonce}`,
      blockNumber: template.blockNumber + BigInt(nonce),
      blockTimestamp: template.blockTimestamp + BigInt(nonce * 3),
      tx: { ...template.tx, amount },
      // KLUDGE: CCTP doesn't know about aux; it would be added by OCW
      aux: { ...template.aux, recipientAddress },
    });
    return tx;
  };

  const txPub = makePublishKit<CctpTxEvidence>();

  return harden({ cctp: { makeTx }, txPub });
};

const makeCustomer = (
  who: string,
  cctp: ReturnType<typeof makeEVM>['cctp'],
  txPublisher: Publisher<CctpTxEvidence>,
  feeConfig: FeeConfig, // TODO: get from vstorage (or at least: a subscriber)
) => {
  const USDC = feeConfig.flat.brand;
  const feeTools = makeFeeTools(feeConfig);
  const sent = [] as CctpTxEvidence[];

  // TODO: get settlerAddr from vstorage
  const [settleAddr] =
    MockCctpTxEvidences.AGORIC_PLUS_OSMO().aux.recipientAddress.split('?');

  const me = harden({
    checkPoolAvailable: async (
      t: ExecutionContext,
      want: NatValue,
      metricsSub: ERef<Subscriber<PoolMetrics>>,
    ) => {
      const { value: m } = await E(metricsSub).getUpdateSince();
      const { numerator: poolBalance } = m.shareWorth; // XXX awkward API?
      const enough = poolBalance.value > want;
      t.log(who, 'sees', poolBalance.value, enough ? '>' : 'NOT >', want);
      return enough;
    },
    sendFast: async (t: ExecutionContext, amount: bigint, EUD: string) => {
      const recipientAddress = `${settleAddr}?EUD=${EUD}`;
      // KLUDGE: UI would ask noble for a forwardingAddress
      // "cctp" here has some noble stuff mixed in.
      const tx = cctp.makeTx(amount, recipientAddress);
      t.log(who, 'signs CCTP for', amount, 'uusdc w/EUD:', EUD);
      txPublisher.publish(tx);
      sent.push(tx);
      await eventLoopIteration();
      return tx;
    },
    checkSent: (
      t: ExecutionContext,
      { bank = [] as any[], local = [] as any[] } = {},
      forward?: unknown,
    ) => {
      const evidence = sent.shift();
      if (!evidence) throw t.fail('nothing sent');

      // C3 - Contract MUST calculate AdvanceAmount by ...
      // Mostly, see unit tests for calculateAdvance, calculateSplit
      const toReceive = forward
        ? { value: evidence.tx.amount }
        : feeTools.calculateAdvance(AmountMath.make(USDC, evidence.tx.amount));

      if (forward) {
        t.log(who, 'waits for fallback / forward');
        t.deepEqual(bank, []); // no vbank GIVE / GRAB
      }

      const { EUD } = addressTools.getQueryParams(
        evidence.aux.recipientAddress,
      );

      const myMsg = local.find(lm => {
        if (lm.type !== 'VLOCALCHAIN_EXECUTE_TX') return false;
        const [ibcTransferMsg] = lm.messages;
        // support advances to noble + other chains
        const receiver =
          ibcTransferMsg.receiver === 'pfm'
            ? JSON.parse(ibcTransferMsg.memo).forward.receiver
            : ibcTransferMsg.receiver;
        return (
          ibcTransferMsg['@type'] ===
            '/ibc.applications.transfer.v1.MsgTransfer' && receiver === EUD
        );
      });
      if (!myMsg) {
        if (forward) return;
        throw t.fail(`no MsgTransfer to ${EUD}`);
      }
      const [ibcTransferMsg] = myMsg.messages;
      // C4 - Contract MUST release funds to the end user destination address
      // in response to invocation by the off-chain watcher that
      // an acceptable Fast USDC Transaction has been initiated.
      t.deepEqual(
        ibcTransferMsg.token,
        { amount: String(toReceive.value), denom: uusdcOnAgoric },
        'C4',
      );
      if (!EUD.startsWith('noble')) {
        t.like(
          JSON.parse(ibcTransferMsg.memo),
          {
            forward: {
              receiver: EUD,
            },
          },
          'PFM receiver is EUD',
        );
      } else {
        t.like(ibcTransferMsg, { receiver: EUD });
      }
      t.is(
        ibcTransferMsg.sourceChannel,
        fetchedChainInfo.agoric.connections['noble-1'].transferChannel
          .channelId,
        'expect routing through Noble',
      );
    },
  });
  return me;
};

test.serial('OCW operators redeem invitations and start watching', async t => {
  const {
    startKit: { zoe, invitations },
    evm: { txPub },
    sync,
  } = t.context;
  const operators = await Promise.all(
    invitations.operator.map(async opInv => {
      const op = makeOracleOperator(opInv, txPub.subscriber, zoe, t);
      await E(op).watch();
      return op;
    }),
  );
  sync.ocw.resolve(operators);
});

// XXX: replace test.serial() with promise synchronization?

test.serial('C25 - LPs can deposit USDC', async t => {
  const {
    startKit: { zoe, instance, metricsSub },
    common: {
      utils,
      brands: { usdc },
    },
    sync,
  } = t.context;
  const usdcPurse = purseOf(usdc.issuer, utils);
  // C25 - MUST support multiple liquidity providers
  const lp = {
    lp50: makeLP('Logan', usdcPurse(50_000_000n), zoe, instance),
    lp200: makeLP('Larry', usdcPurse(200_000_000n), zoe, instance),
  };

  const {
    value: {
      shareWorth: { numerator: balance0 },
    },
  } = await E(metricsSub).getUpdateSince();

  await Promise.all([
    E(lp.lp200).deposit(t, 200_000_000n),
    E(lp.lp50).deposit(t, 50_000_000n),
  ]);

  sync.lp.resolve(lp);
  const {
    value: {
      shareWorth: { numerator: poolBalance },
    },
  } = await E(metricsSub).getUpdateSince();
  t.deepEqual(poolBalance, make(usdc.brand, 250_000_000n + balance0.value));
});

test.serial('STORY01: advancing happy path for 100 USDC', async t => {
  const {
    common: {
      brands: { usdc },
      commonPrivateArgs: { feeConfig },
      utils: { inspectBankBridge, transmitTransferAck },
    },
    evm: { cctp, txPub },
    startKit: { metricsSub },
    bridges: { snapshot, since },
    mint,
  } = t.context;
  const cust1 = makeCustomer('Carl', cctp, txPub.publisher, feeConfig);

  const bridgePos = snapshot();
  const sent1 = await cust1.sendFast(t, 108_000_000n, 'osmo1234advanceHappy');
  await transmitTransferAck(); // ack IBC transfer for advance
  // Nothing we can check here, unless we want to inspect calls to `trace`.
  // `test/exos/advancer.test.ts` covers calls to `log: LogFn` with mocks.
  // This is still helpful to call, so we can observe "Advance transfer
  // fulfilled" in the test output.

  const { calculateAdvance, calculateSplit } = makeFeeTools(feeConfig);
  const expectedAdvance = calculateAdvance(usdc.make(sent1.tx.amount));
  t.log('advancer sent to PoolAccount', expectedAdvance);
  t.deepEqual(inspectBankBridge().at(-1), {
    amount: String(expectedAdvance.value),
    denom: uusdcOnAgoric,
    recipient: 'agoric1fakeLCAAddress',
    type: 'VBANK_GIVE',
  });

  cust1.checkSent(t, since(bridgePos));

  const emptyMetrics = {
    encumberedBalance: usdc.makeEmpty(),
    shareWorth: {
      numerator: usdc.make(1n),
      denominator: { value: 1n },
    },
    totalBorrows: usdc.makeEmpty(),
    totalContractFees: usdc.makeEmpty(),
    totalPoolFees: usdc.makeEmpty(),
    totalRepays: usdc.makeEmpty(),
  };
  const par250 = {
    numerator: usdc.make(250_000_001n),
    denominator: { value: 250_000_001n },
  };

  t.like(
    await E(metricsSub)
      .getUpdateSince()
      .then(r => r.value),
    {
      ...emptyMetrics,
      encumberedBalance: expectedAdvance,
      shareWorth: par250,
      totalBorrows: expectedAdvance,
    },
    'metrics while advancing',
  );

  await mint(sent1);

  // C8 - "Contract MUST be able to initialize settlement process when Noble mints USDC."
  // The metrics are a useful proxy, but the contract could lie.
  // The real test of whether the contract turns minted funds into liquidity is
  // the ability to advance the funds (in later tests).
  const split = calculateSplit(usdc.make(sent1.tx.amount));
  t.like(
    await E(metricsSub)
      .getUpdateSince()
      .then(r => r.value),
    {
      ...emptyMetrics,
      shareWorth: {
        ...par250,
        numerator: add(par250.numerator, split.PoolFee),
      },
      totalBorrows: { value: 105839999n },
      totalContractFees: { value: 432000n },
      totalPoolFees: { value: 1728001n },
      totalRepays: { value: 105839999n },
    },
    'metrics after advancing',
  );
});

// most likely in exo unit tests
test.todo(
  'C21 - Contract MUST log / timestamp each step in the transaction flow',
);

test.serial('STORY03: see accounting metrics', async t => {
  const {
    common: {
      brands: { usdc },
    },
    startKit: { metricsSub },
  } = t.context;
  const { value: metrics } = await E(metricsSub).getUpdateSince();

  t.log(metrics);
  t.true(matches(metrics, PoolMetricsShape));
});
test.todo('document metrics storage schema');
test.todo('get metrics from vstorage');

test.serial('STORY05: LP collects fees on 100 USDC', async t => {
  const {
    sync,
    common: {
      brands: { usdc },
    },
  } = t.context;

  const lp = await sync.lp.promise;
  const got = await E(lp.lp200).withdraw(t, 0.5); // redeem 1/2 my shares

  // C3 - Contract MUST calculate ...
  // Mostly, see unit tests for calculateAdvance, calculateSplit
  // TODO: add a feeTools unit test for the magic number below.
  t.deepEqual(got, add(usdc.units(100), usdc.make(691_200n)));

  await E(lp.lp200).deposit(t, 100_000_000n); // put all but the fees back in
});

test.serial('With 250 available, 3 race to get ~100', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      utils: { transmitTransferAck },
    },
    startKit: { metricsSub },
    mint,
  } = t.context;

  const cust = {
    racer1: makeCustomer('Racer1', cctp, txPub.publisher, feeConfig),
    racer2: makeCustomer('Racer2', cctp, txPub.publisher, feeConfig),
    racer3: makeCustomer('Racer3', cctp, txPub.publisher, feeConfig),
  };

  await cust.racer3.checkPoolAvailable(t, 125_000_000n, metricsSub);

  const bridgePos = snapshot();
  const [sent1, sent2, sent3] = await Promise.all([
    cust.racer1.sendFast(t, 110_000_000n, 'osmo1234a'),
    cust.racer2.sendFast(t, 120_000_000n, 'osmo1234b'),
    cust.racer3.sendFast(t, 125_000_000n, 'osmo1234c'),
  ]);
  cust.racer1.checkSent(t, since(bridgePos));
  cust.racer2.checkSent(t, since(bridgePos));
  // TODO/WIP: cust.racer3.checkSent(t, since(bridgePos), 'forward - LP depleted');
  await transmitTransferAck();
  await transmitTransferAck();
  await transmitTransferAck();
  await Promise.all([mint(sent1), mint(sent2), mint(sent3)]);
});

test.serial('STORY05(cont): LPs withdraw all liquidity', async t => {
  const {
    sync,
    common: {
      brands: { usdc },
    },
  } = t.context;

  const lp = await sync.lp.promise;
  const [a, b] = await Promise.all([
    E(lp.lp200).withdraw(t, 1),
    E(lp.lp50).withdraw(t, 1),
  ]);
  t.log({ a, b, sum: add(a, b) });
  t.truthy(a);
  t.truthy(b);
});

test.serial('STORY09: insufficient liquidity: no FastUSDC option', async t => {
  // STORY09 - As the Fast USDC end user,
  // I should see the option to use Fast USDC unavailable
  // on the UI (and unusable) if there are not funds in the
  // MarketMaker’s account
  const {
    common: {
      commonPrivateArgs: { feeConfig },
    },
    evm: { cctp, txPub },
    startKit: { metricsSub },
  } = t.context;
  const early = makeCustomer('Unice', cctp, txPub.publisher, feeConfig);
  const available = await early.checkPoolAvailable(t, 5_000_000n, metricsSub);
  t.false(available);
});

test.serial('C20 - Contract MUST function with an empty pool', async t => {
  const {
    common: {
      commonPrivateArgs: { feeConfig },
      utils: { transmitTransferAck },
    },
    evm: { cctp, txPub },
    startKit: { metricsSub },
    bridges: { snapshot, since },
    mint,
  } = t.context;
  const custEmpty = makeCustomer('Earl', cctp, txPub.publisher, feeConfig);
  const bridgePos = snapshot();
  const sent = await custEmpty.sendFast(t, 150_000_000n, 'osmo123');
  const bridgeTraffic = since(bridgePos);
  await mint(sent);
  custEmpty.checkSent(t, bridgeTraffic, 'forward');
  t.log('No advancement, just settlement');
  await transmitTransferAck(); // ack IBC transfer for forward
});

// advancedEarly stuff
test.todo(
  'C12 - Contract MUST only pay back the Pool only if they started the advance before USDC is minted',
);

test.todo('C18 - forward - MUST log and alert these incidents');

test.serial('Settlement for unknown transaction (operator down)', async t => {
  const {
    sync,
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      utils: { transmitTransferAck },
    },
    mint,
  } = t.context;
  const operators = await sync.ocw.promise;

  const opDown = makeCustomer('Otto', cctp, txPub.publisher, feeConfig);

  // what removeOperator will do
  await E(E.get(E(operators[1]).getKit()).admin).disable();
  const bridgePos = snapshot();
  const sent = await opDown.sendFast(t, 20_000_000n, 'osmo12345');
  await mint(sent);
  const bridgeTraffic = since(bridgePos);

  t.like(
    bridgeTraffic.bank,
    [
      {
        amount: '20000000',
        sender: 'faucet',
        type: 'VBANK_GRAB',
      },
      {
        amount: '20000000',
        recipient: 'agoric1fakeLCAAddress1',
        type: 'VBANK_GIVE',
      },
    ],
    '20 USDC arrive at the settlement account',
  );
  t.deepEqual(bridgeTraffic.local, [], 'no IBC transfers');

  await transmitTransferAck();
  t.deepEqual(await E(operators[1]).getFailures(), [
    'submitEvidence for disabled operator',
  ]);
});

test.todo(
  'fee levels MUST be visible to external parties - i.e., written to public storage',
);
