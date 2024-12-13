import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath } from '@agoric/ertp';
import type { Denom } from '@agoric/orchestration';
import { divideBy, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import type { IBCChannelID } from '@agoric/vats';
import { makeDoOffer, type WalletDriver } from '../../tools/e2e-tools.js';
import { makeDenomTools } from '../../tools/asset-info.js';
import { createWallet } from '../../tools/wallet.js';
import { makeQueryClient } from '../../tools/query.js';
import { commonSetup, type SetupContextWithWallets } from '../support.js';
import { makeFeedPolicy, oracleMnemonics } from './config.js';
import { makeRandomDigits } from '../../tools/random.js';
import { balancesFromPurses } from '../../tools/purse.js';
import { makeTracer } from '@agoric/internal';

const log = makeTracer('MCFU');

const { keys, values, fromEntries } = Object;
const { isGTE, isEmpty, make } = AmountMath;

const makeRandomNumber = () => Math.random();

const test = anyTest as TestFn<
  SetupContextWithWallets & {
    lpUser: WalletDriver;
    oracleWds: WalletDriver[];
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
  } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts, values(oracleMnemonics));

  // provision oracle wallets first so invitation deposits don't fail
  const oracleWds = await Promise.all(
    keys(oracleMnemonics).map(n =>
      provisionSmartWallet(wallets[n], {
        BLD: 100n,
      }),
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
  const lpUser = await provisionSmartWallet(wallets['lp'], {
    USDC: 8_000n,
    BLD: 100n,
  });

  t.context = {
    ...common,
    lpUser,
    oracleWds,
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

const toOracleOfferId = (idx: number) => `oracle${idx + 1}-accept`;

test.serial('oracles accept', async t => {
  const { oracleWds, retryUntilCondition, vstorageClient, wallets } = t.context;
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const { Invitation } = Object.fromEntries(brands);

  const description = 'oracle operator invitation';

  // ensure we have an unused (or used) oracle invitation in each purse
  let hasAccepted = false;
  for (const name of keys(oracleMnemonics)) {
    const { offerToUsedInvitation, purses } = await vstorageClient.queryData(
      `published.wallet.${wallets[name]}.current`,
    );
    const { value: invitations } = balancesFromPurses(purses)[Invitation];
    const hasInvitation = invitations.some(x => x.description === description);
    const usedInvitation = offerToUsedInvitation?.[0]?.[0] === `${name}-accept`;
    t.log({ name, hasInvitation, usedInvitation });
    t.true(hasInvitation || usedInvitation, 'has or accepted invitation');
    if (usedInvitation) hasAccepted = true;
  }
  // if the oracles have already accepted, skip the rest of the test this is
  // primarily to facilitate active development but could support testing on
  // images where operator invs are already accepted
  if (hasAccepted) return t.pass();

  // accept oracle operator invitations
  const instance = fromEntries(
    await vstorageClient.queryData('published.agoricNames.instance'),
  )[contractName];
  await Promise.all(
    oracleWds.map(makeDoOffer).map((doOffer, i) =>
      doOffer({
        id: toOracleOfferId(i),
        invitationSpec: {
          source: 'purse',
          instance,
          description,
        },
        proposal: {},
      }),
    ),
  );

  for (const name of keys(oracleMnemonics)) {
    const addr = wallets[name];
    await t.notThrowsAsync(() =>
      retryUntilCondition(
        () => vstorageClient.queryData(`published.wallet.${addr}.current`),
        ({ offerToUsedInvitation }) => {
          return offerToUsedInvitation[0][0] === `${name}-accept`;
        },
        `${name} invitation used`,
        { log },
      ),
    );
  }
});

test.serial('lp deposits', async t => {
  const { lpUser, retryUntilCondition, vstorageClient, wallets } = t.context;

  const lpDoOffer = makeDoOffer(lpUser);
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const { USDC, FastLP } = Object.fromEntries(brands);

  const usdcToGive = make(USDC, LP_DEPOSIT_AMOUNT);

  const { shareWorth: currShareWorth } = await vstorageClient.queryData(
    `published.${contractName}.poolMetrics`,
  );
  const poolSharesWanted = divideBy(usdcToGive, currShareWorth);

  await lpDoOffer({
    id: `lp-deposit-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeDepositInvitation']],
    },
    proposal: {
      give: { USDC: usdcToGive },
      want: { PoolShare: poolSharesWanted },
    },
  });

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => vstorageClient.queryData(`published.${contractName}.poolMetrics`),
      ({ shareWorth }) =>
        !isGTE(currShareWorth.numerator, shareWorth.numerator),
      'share worth numerator increases from deposit',
      { log },
    ),
  );

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${wallets['lp']}.current`),
      ({ purses }) => {
        const currentPoolShares = balancesFromPurses(purses)[FastLP];
        return currentPoolShares && isGTE(currentPoolShares, poolSharesWanted);
      },
      'lp has pool shares',
      { log },
    ),
  );
});

const advanceAndSettleScenario = test.macro({
  title: (_, mintAmt: bigint, eudChain: string) =>
    `advance ${mintAmt} uusdc to ${eudChain} and settle`,
  exec: async (t, mintAmt: bigint, eudChain: string) => {
    const {
      nobleTools,
      nobleAgoricChannelId,
      oracleWds,
      retryUntilCondition,
      useChain,
      usdcOnOsmosis,
      vstorageClient,
    } = t.context;

    // EUD wallet on the specified chain
    const eudWallet = await createWallet(
      useChain(eudChain).chain.bech32_prefix,
    );
    const EUD = (await eudWallet.getAccounts())[0].address;
    t.log(`EUD wallet created: ${EUD}`);

    // parameterize agoric address
    const { settlementAccount } = await vstorageClient.queryData(
      `published.${contractName}`,
    );
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
    const evidence = harden({
      blockHash:
        '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
      blockNumber: 21037663n,
      txHash: `0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617${makeRandomDigits(makeRandomNumber(), 2n)}`,
      tx: {
        amount: mintAmt,
        forwardingAddress: userForwardingAddr,
        sender: '0x9a9eE9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9',
      },
      aux: {
        forwardingChannel: nobleAgoricChannelId,
        recipientAddress,
      },
      chainId: 42161,
    });

    log('User initiates evm mint:', evidence.txHash);

    // submit evidences
    await Promise.all(
      oracleWds.map(makeDoOffer).map((doOffer, i) =>
        doOffer({
          id: `${Date.now()}-evm-evidence`,
          invitationSpec: {
            source: 'continuing',
            previousOffer: toOracleOfferId(i),
            invitationMakerName: 'SubmitEvidence',
            invitationArgs: [evidence],
          },
          proposal: {},
        }),
      ),
    );

    const queryClient = makeQueryClient(
      await useChain(eudChain).getRestEndpoint(),
    );

    await t.notThrowsAsync(() =>
      retryUntilCondition(
        () => queryClient.queryBalance(EUD, usdcOnOsmosis),
        ({ balance }) => !!balance?.amount && BigInt(balance.amount) < mintAmt,
        `${EUD} advance available from fast-usdc`,
        // this resolves quickly, so _decrease_ the interval so the timing is more apparent
        { retryIntervalMs: 500 },
      ),
    );

    const queryTxStatus = async () =>
      vstorageClient.queryData(
        `published.${contractName}.status.${evidence.txHash}`,
      );

    const assertTxStatus = async (status: string) =>
      t.notThrowsAsync(() =>
        retryUntilCondition(
          () => queryTxStatus(),
          txStatus => {
            log('tx status', txStatus);
            return txStatus === status;
          },
          `${evidence.txHash} is ${status}`,
        ),
      );

    await assertTxStatus('ADVANCED');
    log('Advance completed, waiting for mint...');

    nobleTools.mockCctpMint(mintAmt, userForwardingAddr);
    await t.notThrowsAsync(() =>
      retryUntilCondition(
        () => vstorageClient.queryData(`published.${contractName}.poolMetrics`),
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
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const { FastLP } = Object.fromEntries(brands);
  t.log('FastLP brand', FastLP);

  const { shareWorth: currShareWorth } = await vstorageClient.queryData(
    `published.${contractName}.poolMetrics`,
  );
  const { purses } = await vstorageClient.queryData(
    `published.wallet.${wallets['lp']}.current`,
  );
  const currentPoolShares = balancesFromPurses(purses)[FastLP];
  t.log('currentPoolShares', currentPoolShares);
  const usdcWanted = multiplyBy(currentPoolShares, currShareWorth);
  t.log('usdcWanted', usdcWanted);

  const { balance: currentUSDCBalance } = await queryClient.queryBalance(
    wallets['lp'],
    usdcDenom,
  );
  t.log(`current ${usdcDenom} balance`, currentUSDCBalance);

  await lpDoOffer({
    id: `lp-withdraw-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeWithdrawInvitation']],
    },
    proposal: {
      give: { PoolShare: currentPoolShares },
      want: { USDC: usdcWanted },
    },
  });

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${wallets['lp']}.current`),
      ({ purses }) => {
        const currentPoolShares = balancesFromPurses(purses)[FastLP];
        return !currentPoolShares || isEmpty(currentPoolShares);
      },
      'lp no longer has pool shares',
      { log },
    ),
  );

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => queryClient.queryBalance(wallets['lp'], usdcDenom),
      ({ balance }) =>
        !!balance?.amount &&
        BigInt(balance.amount) - BigInt(currentUSDCBalance!.amount!) >
          LP_DEPOSIT_AMOUNT,
      "lp's USDC balance increases",
      { log },
    ),
  );
});

test.todo('insufficient LP funds; forward path');
test.todo('mint while Advancing; still Disbursed');
test.todo('transfer failed (e.g. to cosmos, not in env)');
