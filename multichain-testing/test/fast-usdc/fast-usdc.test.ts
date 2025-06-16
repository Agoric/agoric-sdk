import anyTest from '@endo/ses-ava/prepare-endo.js';

import { sleep } from '@agoric/client-utils';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { QueryBalanceResponseSDKType } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { AmountMath } from '@agoric/ertp';
import { divideBy, multiplyBy } from '@agoric/ertp/src/ratio.js';
import type { USDCProposalShapes } from '@agoric/fast-usdc/src/pool-share-math.js';
import type { CctpTxEvidence } from '@agoric/fast-usdc/src/types.js';
import { makeTracer } from '@agoric/internal';
import type { AccountId, Denom, DenomDetail } from '@agoric/orchestration';
import type { ExecutionContext, TestFn } from 'ava';
import { makeDenomTools } from '../../tools/asset-info.js';
import { makeBlocksIterable } from '../../tools/block-iter.js';
import { makeDoOffer } from '../../tools/e2e-tools.js';
import { makeQueryClient, type BlockJson } from '../../tools/query.js';
import { createWallet } from '../../tools/wallet.js';
import { commonSetup } from '../support.js';
import { makeFeedPolicyPartial, oracleMnemonics } from './config.js';
import { agoricNamesQ, fastLPQ, makeTxOracle } from './fu-actors.js';
import { prepareCctpTxEvidence } from './mocks.js';

const { RELAYER_TYPE } = process.env;

const trace = makeTracer('MCFU');

const { keys, values } = Object;
const { isGTE, isEmpty, make, subtract } = AmountMath;

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

const accounts = [...keys(oracleMnemonics), 'lp', 'feeDest'];
const contractName = 'fastUsdc';
const LP_DEPOSIT_AMOUNT = 8_000n * 10n ** 6n;

type QueryClient = ReturnType<typeof makeQueryClient>;

const fuAssetInfo = (assetInfo: string): string => {
  const denomPairs: [Denom, DenomDetail][] = JSON.parse(assetInfo);
  const matchingPair = denomPairs.find(
    ([_, detail]) =>
      detail.chainName === 'agoric' && detail.baseDenom === 'uusdc',
  );
  if (!matchingPair) throw Error('no uusdc on agoric in common assetInfo');
  return JSON.stringify([matchingPair]);
};

const makeTestContext = async (t: ExecutionContext) => {
  const { setupTestKeys, ...common } = await commonSetup(t, {
    config: `../config.fusdc${RELAYER_TYPE ? '.' + RELAYER_TYPE : ''}.yaml`,
  });

  const {
    chainInfo,
    commonBuilderOpts,
    deleteTestKeys,
    faucetTools,
    provisionSmartWallet,
    startContract,
    useChain,
  } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts, values(oracleMnemonics));
  t.log('setupTestKeys:', wallets);

  // provision oracle wallets first so invitation deposits don't fail
  // NOTE: serial await to avoid races
  // (Todo: Use runSerial utility func https://github.com/Agoric/agoric-sdk/issues/11496)
  const oracleWds: Awaited<ReturnType<typeof provisionSmartWallet>>[] = [];
  for await (const n of keys(oracleMnemonics)) {
    const wd = await provisionSmartWallet(wallets[n], {
      BLD: 100n,
    });
    oracleWds.push(wd);
  }

  // calculate denomHash and channelId for privateArgs / builder opts
  const { getTransferChannelId, toDenomHash } = makeDenomTools(chainInfo);
  const usdcDenom = toDenomHash('uusdc', 'noblelocal', 'agoric');
  const usdcOnOsmosis = toDenomHash('uusdc', 'noblelocal', 'osmosis');
  const nobleAgoricChannelId = getTransferChannelId('agoriclocal', 'noble');
  if (!nobleAgoricChannelId) throw new Error('nobleAgoricChannelId not found');
  t.log('nobleAgoricChannelId', nobleAgoricChannelId);
  t.log('usdcDenom', usdcDenom);

  await startContract(
    contractName,
    '../packages/fast-usdc-deploy/src/start-fast-usdc.build.js',
    {
      oracle: keys(oracleMnemonics).map(n => `${n}:${wallets[n]}`),
      usdcDenom,
      feedPolicy: JSON.stringify(makeFeedPolicyPartial(nobleAgoricChannelId)),
      chainInfo: commonBuilderOpts.chainInfo,
      assetInfo: fuAssetInfo(commonBuilderOpts.assetInfo),
    },
  );

  // provide faucet funds for LPs
  await faucetTools.fundFaucet([['noble', 'uusdc']]);

  // save an LP in test context
  const lpUser = await provisionSmartWallet(wallets['lp'], {
    USDC: 8_000n,
    BLD: 100n,
  });
  const feeUser = await provisionSmartWallet(wallets['feeDest'], { BLD: 100n });

  const { vstorageClient } = common;
  const api = makeQueryClient(await useChain('agoric').getRestEndpoint());
  const now = () => Date.now();
  const blockIter = makeBlocksIterable({
    api,
    setTimeout,
    clearTimeout,
    now,
  });
  const oKeys = keys(oracleMnemonics);
  const txOracles = oracleWds.map((wd, ix) =>
    makeTxOracle(oKeys[ix], { wd, vstorageClient, blockIter, now }),
  );

  const attest = async (evidence: CctpTxEvidence, eudChain: string) => {
    await Promise.all(
      txOracles.map(async o => {
        const { block } = await o.submit(evidence);
        console.timeLog(`UX->${eudChain}`, o.getName(), block);
      }),
    );
    console.timeLog(`UX->${eudChain}`, 'submitted x', txOracles.length);
  };

  const acceptInvitations = async () => {
    // ensure we have an unused (or used) oracle invitation in each purse
    for (const op of txOracles) {
      const { detail, usedInvitation } = await op.checkInvitation();
      t.log({ name: op.getName(), hasInvitation: !!detail, usedInvitation });
      t.true(!!detail || usedInvitation, 'has or accepted invitation');
    }

    // accept oracle operator invitations
    await Promise.all(txOracles.map(op => op.acceptInvitation()));

    for (const op of txOracles) {
      await common.retryUntilCondition(
        () => op.checkInvitation(),
        ({ usedInvitation }) => !!usedInvitation,
        `${op.getName()} invitation used`,
        { log: trace },
      );
    }
  };
  await acceptInvitations();

  const provideLpFunds = async () => {
    const lpDoOffer = makeDoOffer(lpUser);

    const { USDC, FastLP } = await agoricNamesQ(vstorageClient).brands('nat');

    const give = { USDC: make(USDC, LP_DEPOSIT_AMOUNT) };

    const metricsPre = await fastLPQ(vstorageClient).metrics();
    const want = { PoolShare: divideBy(give.USDC, metricsPre.shareWorth) };

    const proposal: USDCProposalShapes['deposit'] = harden({ give, want });
    await lpDoOffer({
      id: `lp-deposit-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeDepositInvitation']],
      },
      proposal,
    });

    await common.retryUntilCondition(
      () => fastLPQ(vstorageClient).metrics(),
      ({ shareWorth }) =>
        !isGTE(metricsPre.shareWorth.numerator, shareWorth.numerator),
      'share worth numerator increases from deposit',
      { log: trace },
    );

    const queryClient = makeQueryClient(
      await useChain('agoric').getRestEndpoint(),
    );

    await common.retryUntilCondition(
      () => queryClient.queryBalance(wallets['lp'], 'ufastlp'),
      ({ balance }) => isGTE(toAmt(FastLP, balance), want.PoolShare),
      'lp has pool shares',
      { log: trace },
    );
  };
  await provideLpFunds();

  const makeFakeEvidence = prepareCctpTxEvidence(
    nobleAgoricChannelId,
    (await vstorageClient.queryChildren('published.fastUsdc.txns')).length,
  );

  const queryTxRecord = async (txHash: string) => {
    const record = await common.smartWalletKit.readPublished(
      `fastUsdc.txns.${txHash}`,
    );
    if (!record) {
      throw new Error(`no record for ${txHash}`);
    }
    if (!record.status) {
      throw new Error(`no status for ${txHash}`);
    }
    return record;
  };

  /**
   * Retry until the transaction status is the expected one.
   */
  const assertTxStatus = async (txHash: string, status: string) =>
    common.retryUntilCondition(
      () => queryTxRecord(txHash),
      record => record.status === status,
      `assertTxStatus ${txHash} status is ${status}`,
    );

  const getUsdcDenom = (chainName: string) => {
    switch (chainName) {
      case 'agoric':
        return usdcDenom;
      case 'osmosis':
        return usdcOnOsmosis;
      case 'noble':
        return 'uusdc';
      default:
        throw new Error(`${chainName} not supported in 'getUsdcDenom'`);
    }
  };

  const assertAmtForwarded = (
    queryClient: QueryClient,
    EUD: string,
    eudChain: string,
    mintAmt: bigint,
  ) =>
    common.retryUntilCondition(
      () => queryClient.queryBalance(EUD, getUsdcDenom(eudChain)),
      ({ balance }) => {
        if (!balance) return false; // retry
        const value = BigInt(balance.amount);
        if (value === 0n) return false; // retry
        if (value < mintAmt) {
          throw Error(`fees were deducted: ${value} < ${mintAmt}`);
        }
        t.log('forward done', value, 'uusdc');
        return true;
      },
      `${EUD} forward available from fast-usdc`,
      // this resolves quickly, so _decrease_ the interval so the timing is more apparent
      { retryIntervalMs: 500, maxRetries: 20 },
    );

  const { settlementAccount } = await vstorageClient.queryData(
    `published.${contractName}`,
  );
  t.log('settlementAccount address', settlementAccount);
  const encodeFastUsdcAddressHook = (EUD: string) => {
    const recipientAddress = encodeAddressHook(settlementAccount, { EUD });

    common.nobleTools.registerForwardingAcct(
      nobleAgoricChannelId,
      recipientAddress,
    );
    const { address, exists } = common.nobleTools.queryForwardingAddress(
      nobleAgoricChannelId,
      recipientAddress,
    );
    assert(exists);
    return { recipientAddress, userForwardingAddr: address, exists };
  };

  return {
    ...common,
    api,
    assertAmtForwarded,
    assertTxStatus,
    attest,
    encodeFastUsdcAddressHook,
    feeUser,
    getUsdcDenom,
    lpUser,
    makeFakeEvidence,
    nobleAgoricChannelId,
    oracleWds,
    usdcOnOsmosis,
    usdcDenom,
    wallets,
  };
};
test.before(async t => (t.context = await makeTestContext(t)));

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

const toAmt = (
  brand: Brand<'nat'>,
  balance: QueryBalanceResponseSDKType['balance'],
) => make(brand, BigInt(balance?.amount || 0));

const advanceAndSettleScenario = test.macro({
  title: (_, mintAmt: bigint, eudChain: string) =>
    `advance ${mintAmt} uusdc to ${eudChain} and settle`,
  exec: async (t, mintAmt: bigint, eudChain: string) => {
    const {
      api,
      assertTxStatus,
      attest,
      getUsdcDenom,
      makeFakeEvidence,
      nobleTools,
      retryUntilCondition,
      useChain,
      vstorageClient,
    } = t.context;

    const { encumberedBalance: balanceBeforeBurn } =
      await fastLPQ(vstorageClient).metrics();

    // EUD wallet on the specified chain
    const eudWallet = await createWallet(
      useChain(eudChain).chain.bech32_prefix,
    );
    const EUD = (await eudWallet.getAccounts())[0].address;
    t.log(`EUD wallet created: ${EUD}`);

    const { userForwardingAddr, recipientAddress } =
      t.context.encodeFastUsdcAddressHook(EUD);
    t.log('got forwardingAddress', userForwardingAddr);

    const evidence = makeFakeEvidence(
      mintAmt,
      userForwardingAddr,
      recipientAddress,
    );

    trace('User initiates EVM burn:', evidence.txHash);
    const { block: initialBlock } = await api.queryBlock();
    console.time(`UX->${eudChain}`);
    console.timeLog(
      `UX->${eudChain}`,
      'initial block',
      initialBlock.header.height,
      initialBlock.header.time,
    );

    // submit evidences
    await attest(evidence, eudChain);

    const queryClient = makeQueryClient(
      await useChain(eudChain).getRestEndpoint(),
    );

    let finalBlock: BlockJson;
    {
      const q = await retryUntilCondition(
        () => queryClient.queryBalance(EUD, getUsdcDenom(eudChain)),
        ({ balance }) => {
          if (!balance) return false; // retry
          const value = BigInt(balance.amount);
          if (value >= mintAmt) {
            throw Error(`no fees were deducted: ${value} >= ${mintAmt}`);
          }
          if (value === 0n) return false; // retry
          t.log('advance done', value, 'uusdc');
          return true;
        },
        `${EUD} advance available from fast-usdc`,
        // this resolves quickly, so _decrease_ the interval so the timing is more apparent
        { retryIntervalMs: 500, maxRetries: 20 },
      );
      console.timeLog(`UX->${eudChain}`, 'rxd', q.balance?.amount);
      ({ block: finalBlock } = await api.queryBlock());
      console.timeLog(
        `UX->${eudChain}`,
        'final block',
        finalBlock.header.height,
        finalBlock.header.time,
      );
    }
    console.timeEnd(`UX->${eudChain}`);
    const blockDur =
      Number(finalBlock.header.height) - Number(initialBlock.header.height);
    const MAIN_BLOCK_SECS = 7;
    const MAIN_MAX_DUR = 120; // product requirement: 2 min
    const MARGIN_OF_ERROR = 0.2;
    const mainWallClockEstimate = blockDur * MAIN_BLOCK_SECS;
    t.log({
      initialHeight: initialBlock.header.height,
      finalHeight: finalBlock.header.height,
      blockDur,
      mainWallClockEstimate,
    });
    t.true(mainWallClockEstimate * (1 + MARGIN_OF_ERROR) <= MAIN_MAX_DUR);

    await assertTxStatus(evidence.txHash, 'ADVANCED');
    trace('Advance completed, waiting for mint...');

    nobleTools.mockCctpMint(mintAmt, userForwardingAddr);
    await retryUntilCondition(
      () => fastLPQ(vstorageClient).metrics(),
      ({ encumberedBalance }) =>
        AmountMath.isEqual(encumberedBalance, balanceBeforeBurn),
      'encumberedBalance returns to original value',
    );

    // retry until status is reached
    await assertTxStatus(evidence.txHash, 'DISBURSED');
  },
});

test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 4n, 'osmosis');
test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 8n, 'noble');
test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 5n, 'agoric');

/**
 * 1. Evidence is published to the transaction feed
 * 2. Advancer observes the evidence
 * 3. poolAccount borrows from liquidity pool and sends to `nobleICA`
 * 4. When that settles, we get the IBC ACK
 * 5. Call `MsgDepositForBurn` on `nobleICA`
 * 6. CCTP relayer calls ReceiveMsg on EVM destination using attestation from Circle (looks for the burn in order to make the attestation)
 *    (Read the self-relaying guid
 */
test.serial('Ethereum destination', async t => {
  const mintAmt = LP_DEPOSIT_AMOUNT / 6n;
  const {
    assertTxStatus,
    attest,
    makeFakeEvidence,
    nobleTools,
    retryUntilCondition,
    vstorageClient,
  } = t.context;
  const eudChain = 'ethereum';
  console.time(`UX->${eudChain}`);

  // Ethereum EUD
  const EUD: AccountId = 'eip155:1:0x1234567890123456789012345678901234567890';
  t.log(`Ethereum EUD: ${EUD}`);

  const { recipientAddress, userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook(EUD);

  const evidence = makeFakeEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  const { encumberedBalance: balanceBeforeBurn } =
    await fastLPQ(vstorageClient).metrics();

  trace('User initiates EVM burn:', evidence.txHash);
  await attest(evidence, eudChain);

  await assertTxStatus(evidence.txHash, 'ADVANCED');
  trace('Advance completed, waiting for mint...');

  t.true(
    AmountMath.isGTE(
      (await fastLPQ(vstorageClient).metrics()).encumberedBalance,
      balanceBeforeBurn,
    ),
    'encumberedBalance must go up upon advance',
  );

  // Here is would be ideal to check the balance of `nobleICA` account to make sure
  // it decreases by the mint amount. The actual `MsgDepositForBurn` message is our
  // interface with CCTP, which isn't being tested, so we should test that we're
  // fulfilling that interface. Since that's laborious we use a proxy: that the
  // balance goes up (presumably to due to the transfer) and back down
  // (presumably due the burn message.) Our lower level tests are verifying that
  // the messages are being sent.
  //
  // However, 1) it's difficult to do with Noble v7 and Cosmos SDK v47 we have
  // available at present and 2) the vow will reject if there's a problem with
  // the CCTP burn.
  // So for now we have sufficient coverage. When we're on Noble v9 and Cosmos SDK v50+
  // we should have a helper to check the balances. This commit is a good place to start:
  // https://github.com/Agoric/agoric-sdk/commit/7eedb191cda713232b54a48c1775146f8b6599a0

  // Verify disbursement succeeds
  nobleTools.mockCctpMint(mintAmt, userForwardingAddr);
  await retryUntilCondition(
    () => fastLPQ(vstorageClient).metrics(),
    ({ encumberedBalance }) =>
      AmountMath.isEqual(encumberedBalance, balanceBeforeBurn),
    'encumberedBalance returns to original value',
  );

  await assertTxStatus(evidence.txHash, 'DISBURSED');
});

test.serial('advance failed', async t => {
  const mintAmt = LP_DEPOSIT_AMOUNT / 10n;
  const { assertTxStatus, attest, makeFakeEvidence, nobleTools } = t.context;
  const eudChain = 'unreachable';

  // EUD wallet on the specified chain
  const eudWallet = await createWallet(eudChain);
  const EUD = (await eudWallet.getAccounts())[0].address;
  t.log(`EUD wallet created: ${EUD}`);

  const { recipientAddress, userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook(EUD);

  const evidence = makeFakeEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  t.log('User initiates EVM burn:', evidence.txHash);
  await attest(evidence, eudChain);
  await assertTxStatus(evidence.txHash, 'ADVANCE_FAILED');

  nobleTools.mockCctpMint(mintAmt, userForwardingAddr);

  await assertTxStatus(evidence.txHash, 'FORWARD_FAILED');

  t.pass();
});

test.serial('lp withdraws', async t => {
  const {
    lpUser,
    retryUntilCondition,
    useChain,
    usdcDenom,
    vstorageClient,
    wallets,
  } = t.context;
  const queryClient = makeQueryClient(
    await useChain('agoric').getRestEndpoint(),
  );
  const lpDoOffer = makeDoOffer(lpUser);
  const { FastLP } = await agoricNamesQ(vstorageClient).brands('nat');
  t.log('FastLP brand', FastLP);

  const metricsPre = await fastLPQ(vstorageClient).metrics();

  const { balance: lpCoins } = await queryClient.queryBalance(
    wallets['lp'],
    'ufastlp',
  );
  const give = { PoolShare: toAmt(FastLP, lpCoins) };
  t.log('give', give, lpCoins);

  const { balance: usdcCoinsPre } = await queryClient.queryBalance(
    wallets['lp'],
    usdcDenom,
  );
  t.log('usdc coins pre', usdcCoinsPre);

  const want = { USDC: multiplyBy(give.PoolShare, metricsPre.shareWorth) };
  t.log('want', want);

  const proposal: USDCProposalShapes['withdraw'] = harden({ give, want });
  await lpDoOffer({
    id: `lp-withdraw-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeWithdrawInvitation']],
    },
    proposal,
  });

  await retryUntilCondition(
    () => queryClient.queryBalance(wallets['lp'], 'ufastlp'),
    ({ balance }) => isEmpty(toAmt(FastLP, balance)),
    'lp no longer has pool shares',
    { log: trace },
  );

  const USDC = want.USDC.brand;
  await retryUntilCondition(
    () => queryClient.queryBalance(wallets['lp'], usdcDenom),
    // TODO refactor this retry until balance changes, then separately assert it's correct
    ({ balance }) =>
      !isGTE(
        make(USDC, LP_DEPOSIT_AMOUNT),
        subtract(toAmt(USDC, balance), toAmt(USDC, usdcCoinsPre)),
      ),
    "lp's USDC balance increases",
    { log: trace },
  );

  t.pass();
});

test.serial('distribute FastUSDC contract fees', async t => {
  const io = t.context;
  const queryClient = makeQueryClient(
    await io.useChain('agoric').getRestEndpoint(),
  );

  const opts = {
    destinationAddress: io.wallets['feeDest'],
    feePortion: 0.25,
  };
  t.log('build, run proposal to distribute fees', opts);
  await io.deployBuilder(
    '../packages/fast-usdc-deploy/src/fast-usdc-fees.build.js',
    {
      ...opts,
      feePortion: `${opts.feePortion}`,
    },
  );

  const { balance } = await io.retryUntilCondition(
    () => queryClient.queryBalance(opts.destinationAddress, io.usdcDenom),
    ({ balance }) => !!balance && BigInt(balance.amount) > 0n,
    `fees received at ${opts.destinationAddress}`,
  );
  t.log('fees received', balance);
  t.truthy(balance?.amount);
});

test.serial('insufficient LP funds; forward path', async t => {
  const eudChain = 'osmosis';
  const mintAmt = LP_DEPOSIT_AMOUNT * 2n;
  const {
    assertAmtForwarded,
    assertTxStatus,
    attest,
    makeFakeEvidence,
    nobleTools,
    useChain,
  } = t.context;

  // EUD wallet on the specified chain
  const eudWallet = await createWallet(useChain(eudChain).chain.bech32_prefix);
  const EUD = (await eudWallet.getAccounts())[0].address;
  t.log(`EUD wallet created: ${EUD}`);

  const { recipientAddress, userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook(EUD);

  const evidence = makeFakeEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  t.log('User initiates EVM burn:', evidence.txHash);
  // submit evidences
  await attest(evidence, eudChain);

  const queryClient = makeQueryClient(
    await useChain(eudChain).getRestEndpoint(),
  );

  await assertTxStatus(evidence.txHash, 'ADVANCE_SKIPPED');

  nobleTools.mockCctpMint(mintAmt, userForwardingAddr);

  await assertTxStatus(evidence.txHash, 'FORWARDED');
  await assertAmtForwarded(queryClient, EUD, eudChain, mintAmt);
  t.pass();
});

test.serial('minted before observed; forward path', async t => {
  const eudChain = 'osmosis';
  const mintAmt = LP_DEPOSIT_AMOUNT / 10n;
  const {
    assertAmtForwarded,
    assertTxStatus,
    attest,
    makeFakeEvidence,
    nobleTools,
    useChain,
  } = t.context;

  // EUD wallet on the specified chain
  const eudWallet = await createWallet(useChain(eudChain).chain.bech32_prefix);
  const EUD = (await eudWallet.getAccounts())[0].address;
  t.log(`EUD wallet created: ${EUD}`);

  const { recipientAddress, userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook(EUD);

  const evidence = makeFakeEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  const queryClient = makeQueryClient(
    await useChain(eudChain).getRestEndpoint(),
  );

  t.log(`UX->${eudChain}`, 'minting before evidence observed');
  nobleTools.mockCctpMint(mintAmt, userForwardingAddr);
  // Wait for mint to complete before submitting evidence
  await sleep(5000, { log: t.log, setTimeout });

  // submit evidences
  await attest(evidence, 'invalid');

  await assertTxStatus(evidence.txHash, 'FORWARDED');
  await assertAmtForwarded(queryClient, EUD, eudChain, mintAmt);
  t.pass();
});

test.serial('forward skipped due to invalid EUD', async t => {
  const mintAmt = LP_DEPOSIT_AMOUNT * 2n;
  const {
    api,
    assertTxStatus,
    attest,
    getUsdcDenom,
    makeFakeEvidence,
    nobleTools,
    vstorageClient,
  } = t.context;

  // EUD wallet on the specified chain
  const eudWallet = await createWallet('invalideud');
  const EUD = (await eudWallet.getAccounts())[0].address;
  t.log(`EUD wallet created: ${EUD}`);

  // parameterize agoric address
  const { settlementAccount } = await vstorageClient.queryData(
    `published.${contractName}`,
  );
  t.log('settlementAccount address', settlementAccount);

  const querySettlementAccountBalance = async () =>
    (await api.queryBalance(settlementAccount, getUsdcDenom('agoric'))).balance;
  const startingSettlementBalance = await querySettlementAccountBalance();
  t.log(
    'starting settlementAccount balance',
    startingSettlementBalance?.amount,
    startingSettlementBalance?.denom,
  );

  const { recipientAddress, userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook(EUD);

  const evidence = makeFakeEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  // submit evidences
  await attest(evidence, 'invalid');

  await assertTxStatus(evidence.txHash, 'ADVANCE_SKIPPED');

  nobleTools.mockCctpMint(mintAmt, userForwardingAddr);

  await assertTxStatus(evidence.txHash, 'FORWARD_SKIPPED');

  const endingSettlementAccountBalance = await querySettlementAccountBalance();
  t.log(
    'ending settlementAccount balance',
    endingSettlementAccountBalance?.amount,
    endingSettlementAccountBalance?.denom,
  );
  t.is(
    BigInt(endingSettlementAccountBalance?.amount ?? '0'),
    BigInt(startingSettlementBalance?.amount ?? '0') + mintAmt,
  );
});

test.todo('mint while Advancing; still Disbursed');
test.todo('test with rc2, settler-reference proposal');

test.serial('sendFromSettlementAccount', async t => {
  const io = t.context;
  const queryClient = makeQueryClient(
    await io.useChain('agoric').getRestEndpoint(),
  );

  const opts = {
    destinationAddress: io.wallets['feeDest'],
    principal: '1232869579', // truncation of real value to not exceed available funds
  };

  const { userForwardingAddr } =
    t.context.encodeFastUsdcAddressHook('invalideud');

  // Forward USDC to the settlement account, but with an invalid EUD
  // so they sit there.
  const mintResult = t.context.nobleTools.mockCctpMint(
    BigInt(opts.principal) * 1_000_000n,
    userForwardingAddr,
  );
  console.debug('mint result', mintResult);
  const balancesBefore = await queryClient.queryBalance(
    opts.destinationAddress,
    io.usdcDenom,
  );
  t.log('build, run proposal to distribute fees', opts);
  await io.deployBuilder(
    '../packages/fast-usdc-deploy/src/reimburse-manual-intervention.build.js',
    opts,
  );

  const { balance } = await io.retryUntilCondition(
    () => queryClient.queryBalance(opts.destinationAddress, io.usdcDenom),
    ({ balance }) => !!balance && BigInt(balance.amount) > 0n,
    `funds received at ${opts.destinationAddress}`,
  );
  t.log('funds received', balance);
  const prev = BigInt(balancesBefore!.balance!.amount! || 0n);
  t.is(BigInt(balance!.amount), prev + BigInt(opts.principal));
});
