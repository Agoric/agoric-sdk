import anyTest from '@endo/ses-ava/prepare-endo.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath } from '@agoric/ertp';
import type { Denom } from '@agoric/orchestration';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { IBCChannelID } from '@agoric/vats';
import { divideBy, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Random } from '@cosmjs/crypto';
import type { ExecutionContext, TestFn } from 'ava';
import { makeDenomTools } from '../../tools/asset-info.js';
import { makeDoOffer, type WalletDriver } from '../../tools/e2e-tools.js';
import { makeQueryClient } from '../../tools/query.js';
import { makeRandomDigits } from '../../tools/random.js';
import type { RetryUntilCondition } from '../../tools/sleep.js';
import { createWallet } from '../../tools/wallet.js';
import { commonSetup, type SetupContextWithWallets } from '../support.js';
import { makeFeedPolicy, oracleMnemonics } from './config.js';

const { keys, values, fromEntries } = Object;
const { isGTE, isEmpty, make } = AmountMath;

type VStorageClient = Awaited<ReturnType<typeof commonSetup>>['vstorageClient'];

const test = anyTest as TestFn<
  SetupContextWithWallets & {
    txOracles: TxOracle[];
    lpWallet: WalletDriver;
    nobleAgoricChannelId: IBCChannelID;
    usdcOnOsmosis: Denom;
    /** usdc on agoric */
    usdcDenom: Denom;
  }
>;

const accounts = [...keys(oracleMnemonics), 'lp'];
const contractName = 'fastUsdc';
const contractBuilder =
  '../packages/builders/scripts/fast-usdc/init-fast-usdc.js';
const LP_DEPOSIT_AMOUNT = 8_000n * 10n ** 6n;

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const {
    chainInfo,
    commonBuilderOpts,
    deleteTestKeys,
    faucetTools,
    provisionSmartWallet,
    startContract,
    vstorageClient,
    retryUntilCondition,
  } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts, values(oracleMnemonics));

  // provision oracle wallets first so invitation deposits don't fail
  const txOracles = await Promise.all(
    keys(oracleMnemonics).map(async name =>
      makeTxOracle(
        name,
        await provisionSmartWallet(wallets[name], { BLD: 100n }),
        wallets[name],
        vstorageClient,
        retryUntilCondition,
        () => Date.now(),
      ),
    ),
  );

  // calculate denomHash and channelId for privateArgs / builder opts
  const { getTransferChannelId, toDenomHash } = makeDenomTools(chainInfo);
  const usdcDenom = toDenomHash('uusdc', 'noblelocal', 'agoric');
  const usdcOnOsmosis = toDenomHash('uusdc', 'noblelocal', 'osmosis');
  const nobleAgoricChannelId = getTransferChannelId('agoriclocal', 'noble');
  if (!nobleAgoricChannelId) throw new Error('nobleAgoricChannelId not found');
  t.log('nobleAgoricChannelId', nobleAgoricChannelId);
  t.log('usdcDenom', usdcDenom);

  await startContract(contractName, contractBuilder, {
    oracle: keys(oracleMnemonics).map(n => `${n}:${wallets[n]}`),
    usdcDenom,
    feedPolicy: JSON.stringify(makeFeedPolicy(nobleAgoricChannelId)),
    ...commonBuilderOpts,
  });

  // provide faucet funds for LPs
  await faucetTools.fundFaucet([['noble', 'uusdc']]);

  // save an LP in test context
  const lpWallet = await provisionSmartWallet(wallets['lp'], {
    USDC: 8_000n,
    BLD: 100n,
  });

  t.context = {
    ...common,
    txOracles,
    lpWallet: lpWallet,
    provisionSmartWallet,
    nobleAgoricChannelId,
    usdcOnOsmosis,
    usdcDenom,
    wallets,
  };
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

const agoricNamesQ = (vsc: VStorageClient) =>
  harden({
    instance: (name: string) =>
      vsc
        .queryData('published.agoricNames.instance')
        .then(pairs => fromEntries(pairs)[name] as Instance),
    brands: () =>
      vsc
        .queryData('published.agoricNames.brand')
        .then(pairs => fromEntries(pairs) as Record<string, Brand>),
  });

const walletQ = (vsc: VStorageClient) =>
  harden({
    current: (addr: string) =>
      vsc.queryData(
        `published.wallet.${addr}.current`,
      ) as Promise<CurrentWalletRecord>,
  });

// XXX TODO: import metrics types
export interface PoolStats {
  totalBorrows: Amount<'nat'>;
  totalContractFees: Amount<'nat'>;
  totalPoolFees: Amount<'nat'>;
  totalRepays: Amount<'nat'>;
}

export interface PoolMetrics extends PoolStats {
  encumberedBalance: Amount<'nat'>;
  shareWorth: Ratio;
}

const fastLPQ = (vsc: VStorageClient) =>
  harden({
    metrics: () =>
      vsc.queryData(
        `published.${contractName}.poolMetrics`,
      ) as Promise<PoolMetrics>,
    info: () =>
      vsc.queryData(`published.${contractName}`) as Promise<{
        poolAccount: string;
        settlementAccount: string;
      }>,
    txStatus: (txHash: string) =>
      vsc.queryData(`published.${contractName}.status.${txHash}`),
  });

const makeTxOracle = (
  name: string,
  wd: WalletDriver,
  address: string,
  vstorageClient: VStorageClient,
  retryUntilCondition: RetryUntilCondition,
  now: () => number,
) => {
  const acceptOfferId = `${name}-accept`;

  const instanceP = agoricNamesQ(vstorageClient).instance(contractName);
  const brandP = agoricNamesQ(vstorageClient).brands();

  const description = 'oracle operator invitation';

  const doOffer = makeDoOffer(wd);
  const self = harden({
    getName: () => name,
    getAddr: () => address,
    acceptInvitation: async () => {
      const instance = await instanceP;
      await doOffer({
        id: acceptOfferId,
        invitationSpec: { source: 'purse', instance, description },
        proposal: {},
      });

      await retryUntilCondition(
        () => self.checkInvitation(),
        check => check.usedInvitation,
        `${name} invitation used`,
      );
    },
    checkInvitation: async () => {
      const { Invitation } = await brandP;
      const { offerToUsedInvitation, purses } =
        await walletQ(vstorageClient).current(address);
      type InvitationDetails = { description: string }; // TODO: import from Zoe
      const { value: details } = purses.find(p => p.brand === Invitation)!
        .balance as Amount<'set', InvitationDetails>;
      const invitation = details.find(x => x.description === description);
      const usedInvitation = offerToUsedInvitation.some(
        ([k, _v]) => k === `${name}-accept`,
      );
      return { invitation, usedInvitation };
    },
    submit: (evidence: Record<string, unknown>) => {
      doOffer({
        id: `${now()}-evm-evidence`,
        invitationSpec: {
          source: 'continuing',
          previousOffer: acceptOfferId,
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence],
        },
        proposal: {},
      });
    },
  });
  return self;
};
type TxOracle = ReturnType<typeof makeTxOracle>;

test.serial('oracles accept', async t => {
  const { txOracles } = t.context;

  const checks = await Promise.all(
    txOracles.map(async op => {
      const { invitation, usedInvitation } = await op.checkInvitation();
      t.log({ name: op.getName(), invitation, usedInvitation });
      t.truthy(invitation || usedInvitation, 'has or accepted invitation');
      return usedInvitation;
    }),
  );
  // if the oracles have already accepted, skip the rest of the test this is
  // primarily to facilitate active development but could support testing on
  // images where operator invs are already accepted
  if (checks.some(b => b)) {
    return t.pass();
  }

  // accept oracle operator invitations
  await t.notThrowsAsync(
    Promise.all(txOracles.map(op => op.acceptInvitation())),
  );
});

const makeLiquidityProvider = (
  my: {
    address: string; // XXX should be availble from wd
    wd: WalletDriver;
  },
  the: {
    vstorageClient: VStorageClient;
    retryUntilCondition: RetryUntilCondition;
    now: () => number;
  },
) => {
  const lpDoOffer = makeDoOffer(my.wd);
  const { vstorageClient: vsc } = the;

  const self = harden({
    getAddr: () => my.address,
    getBalance: async (brand: Brand) => {
      const { purses } = await walletQ(vsc).current(my.address);
      const found = purses.find(p => p.brand === brand);
      return found?.balance;
    },
    deposit: async (amt: Amount<'nat'>) => {
      const { shareWorth } = await fastLPQ(vsc).metrics();
      const want = { PoolShare: divideBy(amt, shareWorth) };

      await lpDoOffer({
        id: `lp-deposit-${the.now()}`,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: [contractName],
          callPipe: [['makeDepositInvitation']],
        },
        proposal: { give: { USDC: amt }, want },
      });
      return { pre: { shareWorth }, want };
    },
    withdrawAll: async (t: ExecutionContext, chain, usdcDenom) => {
      const queryClient = makeQueryClient(chain);
      const { FastLP } = await agoricNamesQ(vsc).brands();
      t.log('FastLP brand', FastLP);

      const { shareWorth } = await fastLPQ(vsc).metrics();
      const sharesPre = (await self.getBalance(FastLP)) as Amount<'nat'>;
      assert(sharesPre);
      t.log('sharesPre', sharesPre);
      const want = { USDC: multiplyBy(sharesPre, shareWorth) };
      t.log('want.USDC', want.USDC);

      const { balance: currentUSDCBalance } = await queryClient.queryBalance(
        my.address,
        usdcDenom,
      );
      t.log(`current ${usdcDenom} balance`, currentUSDCBalance);

      await lpDoOffer({
        id: `lp-withdraw-${the.now()}`,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: [contractName],
          callPipe: [['makeWithdrawInvitation']],
        },
        proposal: { give: { PoolShare: sharesPre }, want },
      });

      await t.notThrowsAsync(() =>
        the.retryUntilCondition(
          () => self.getBalance(FastLP),
          poolShares => !poolShares || isEmpty(poolShares),
          'lp no longer has pool shares',
        ),
      );

      await t.notThrowsAsync(() =>
        the.retryUntilCondition(
          () => queryClient.queryBalance(my.address, usdcDenom),
          ({ balance }) =>
            !!balance?.amount &&
            BigInt(balance.amount) - BigInt(currentUSDCBalance!.amount!) >
              LP_DEPOSIT_AMOUNT,
          "lp's USDC balance increases",
        ),
      );
      return { pre: { uusdc: currentUSDCBalance } };
    },
  });
  return self;
};

test.serial('lp deposits', async t => {
  const {
    lpWallet: lpWallet,
    retryUntilCondition,
    vstorageClient,
    wallets,
  } = t.context;

  const lp = makeLiquidityProvider(
    { address: wallets.lp, wd: lpWallet },
    { vstorageClient, now: () => Date.now(), retryUntilCondition },
  );
  const { USDC, FastLP } = await agoricNamesQ(vstorageClient).brands();

  const { pre, want } = await lp.deposit(make(USDC, LP_DEPOSIT_AMOUNT));

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => fastLPQ(vstorageClient).metrics(),
      ({ shareWorth }) =>
        !isGTE(pre.shareWorth.numerator, shareWorth.numerator),
      'share worth numerator increases from deposit',
    ),
  );

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => lp.getBalance(FastLP),
      lpShares => Boolean(lpShares && isGTE(lpShares, want.PoolShare)),
      'lp has pool shares',
    ),
  );
});

const makeUserAgent = (
  my: { wallet: Awaited<ReturnType<typeof createWallet>> },
  vstorageClient: VStorageClient,
  nobleTools: SetupContextWithWallets['nobleTools'],
  nobleAgoricChannelId: IBCChannelID,
) => {
  return harden({
    sendFast: async (t: ExecutionContext, mintAmt: bigint) => {
      const EUD = (await my.wallet.getAccounts())[0].address;
      t.log(`EUD wallet created: ${EUD}`);

      // parameterize agoric address
      const { settlementAccount } = await fastLPQ(vstorageClient).info();
      t.log('settlementAccount address', settlementAccount);

      const recipientAddress = encodeAddressHook(settlementAccount, { EUD });
      t.log('recipientAddress', recipientAddress);

      // register forwarding address on noble
      const txRes = nobleTools.registerForwardingAcct(
        nobleAgoricChannelId,
        recipientAddress,
      );
      t.is(txRes?.code, 0, 'registered forwarding account');
      const { address: userForwardingAddr } = nobleTools.queryForwardingAddress(
        nobleAgoricChannelId,
        recipientAddress,
      );
      t.log('got forwardingAddress', userForwardingAddr);

      // TODO export CctpTxEvidence type
      const tx = harden({
        txHash: `0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617${makeRandomDigits(Math.random(), 2n)}`,
        tx: {
          amount: mintAmt,
          forwardingAddress: userForwardingAddr,
        },
        aux: {
          forwardingChannel: nobleAgoricChannelId,
          recipientAddress,
        },
        chainId: 42161,
      });

      console.log('User initiates evm mint:', tx.txHash);

      return { tx, EUD, userForwardingAddr };
    },
  });
};

const advanceAndSettleScenario = test.macro({
  title: (_, mintAmt: bigint, eudChain: string) =>
    `advance ${mintAmt} uusdc to ${eudChain} and settle`,
  exec: async (t, mintAmt: bigint, eudChain: string) => {
    const {
      nobleTools,
      nobleAgoricChannelId,
      retryUntilCondition,
      useChain,
      usdcOnOsmosis,
      vstorageClient,
      txOracles,
    } = t.context;

    // EUD wallet on the specified chain
    const eudWallet = await createWallet(
      useChain(eudChain).chain.bech32_prefix,
      undefined,
      { getBytes: Random.getBytes },
    );
    const ua = makeUserAgent(
      { wallet: eudWallet },
      vstorageClient,
      nobleTools,
      nobleAgoricChannelId,
    );
    const { tx, EUD, userForwardingAddr } = await ua.sendFast(t, mintAmt);

    // TODO export CctpTxEvidence type
    const evidence = harden({
      ...tx,
      blockHash:
        '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
      blockNumber: 21037663n,
    });

    console.log('User initiates evm mint:', evidence.txHash);

    // submit evidences
    await Promise.all(txOracles.map(op => op.submit(evidence)));

    const queryClient = makeQueryClient(
      await useChain(eudChain).getRestEndpoint(),
    );

    // XXX this part should be in the ua
    await t.notThrowsAsync(() =>
      retryUntilCondition(
        () => queryClient.queryBalance(EUD, usdcOnOsmosis),
        ({ balance }) => !!balance?.amount && BigInt(balance.amount) < mintAmt,
        `${EUD} advance available from fast-usdc`,
        // this resolves quickly, so _decrease_ the interval so the timing is more apparent
        { retryIntervalMs: 500 },
      ),
    );

    const assertTxStatus = async (status: string) =>
      t.notThrowsAsync(() =>
        retryUntilCondition(
          () => fastLPQ(vstorageClient).txStatus(evidence.txHash),
          txStatus => {
            console.log('tx status', txStatus);
            return txStatus === status;
          },
          `${evidence.txHash} is ${status}`,
        ),
      );

    await assertTxStatus('ADVANCED');
    console.log('Advance completed, waiting for mint...');

    nobleTools.mockCctpMint(mintAmt, userForwardingAddr);
    await t.notThrowsAsync(() =>
      retryUntilCondition(
        () => fastLPQ(vstorageClient).metrics(),
        ({ encumberedBalance }) =>
          encumberedBalance && isEmpty(encumberedBalance),
        'encumberedBalance returns to 0',
      ),
    );

    await assertTxStatus('DISBURSED');
  },
});

test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 4n, 'osmosis');
test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 8n, 'noble');
test.serial(advanceAndSettleScenario, LP_DEPOSIT_AMOUNT / 5n, 'agoric');

test.serial('lp withdraws', async t => {
  const {
    lpWallet: lpUser,
    retryUntilCondition,
    useChain,
    usdcDenom,
    vstorageClient,
    wallets,
  } = t.context;

  const lp = makeLiquidityProvider(
    { address: wallets.lp, wd: lpUser },
    { now: () => Date.now(), retryUntilCondition, vstorageClient },
  );

  await lp.withdrawAll(t, useChain('agoric'), usdcDenom);
});

test.todo('insufficient LP funds; forward path');
test.todo('mint while Advancing; still Disbursed');
test.todo('transfer failed (e.g. to cosmos, not in env)');
