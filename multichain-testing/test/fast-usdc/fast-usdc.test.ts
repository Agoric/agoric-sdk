import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import type { Denom } from '@agoric/orchestration';
import { divideBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import type { IBCChannelID } from '@agoric/vats';
import { makeDoOffer, type WalletDriver } from '../../tools/e2e-tools.js';
import { makeDenomTools } from '../../tools/asset-info.js';
import { createWallet } from '../../tools/wallet.js';
import { makeQueryClient } from '../../tools/query.js';
import { commonSetup, type SetupContextWithWallets } from '../support.js';
import { makeFeedPolicy, oracleMnemonics } from './config.js';
import { makeRandomDigits } from '../../tools/random.js';

const { keys, values, fromEntries } = Object;
const { isGTE, isEmpty, make } = AmountMath;

const test = anyTest as TestFn<
  SetupContextWithWallets & {
    lpUser: WalletDriver;
    oracleWds: WalletDriver[];
    nobleAgoricChannelId: IBCChannelID;
    usdcOnOsmosis: Denom;
  }
>;

const accounts = [...keys(oracleMnemonics), 'lp'];
const contractName = 'fastUsdc';
const contractBuilder =
  '../packages/builders/scripts/fast-usdc/init-fast-usdc.js';

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
  deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts, values(oracleMnemonics));

  // provision oracle wallets first so invitation deposits don't fail
  const oracleWdPs = keys(oracleMnemonics).map(n =>
    provisionSmartWallet(wallets[n], {
      BLD: 100n,
    }),
  );
  // execute sequentially, to avoid "published.wallet.${addr}.current: fetch failed"
  const oracleWds: WalletDriver[] = [];
  for (const p of oracleWdPs) {
    const wd = await p;
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

  await startContract(contractName, contractBuilder, {
    oracle: keys(oracleMnemonics).map(n => `${n}:${wallets[n]}`),
    usdcDenom: usdcDenom,
    feedPolicy: makeFeedPolicy(nobleAgoricChannelId),
    ...commonBuilderOpts,
  });

  // provide faucet funds for LPs
  await faucetTools.fundFaucet([['noble', 'uusdc']]);

  // save an LP in test context
  const lpUser = await provisionSmartWallet(wallets['lp'], {
    USDC: 100n,
    BLD: 100n,
  });

  t.context = {
    ...common,
    lpUser,
    oracleWds,
    nobleAgoricChannelId,
    usdcOnOsmosis,
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

  const instances = await vstorageClient.queryData(
    'published.agoricNames.instance',
  );
  const instance = fromEntries(instances)[contractName];

  // accept oracle operator invitations
  await Promise.all(
    oracleWds.map(makeDoOffer).map((doOffer, i) =>
      doOffer({
        id: toOracleOfferId(i),
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'oracle operator invitation', // TODO export/import INVITATION_MAKERS_DESC
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
      ),
    );
  }
});

test.serial('lp deposits', async t => {
  const { lpUser, retryUntilCondition, vstorageClient } = t.context;

  const lpDoOffer = makeDoOffer(lpUser);
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const { USDC } = Object.fromEntries(brands);

  const usdcGive = make(USDC, 10_000_000n);

  const { shareWorth: currShareWorth } = await vstorageClient.queryData(
    `published.${contractName}.poolMetrics`,
  );

  await lpDoOffer({
    id: `lp-deposit-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeDepositInvitation']],
    },
    proposal: {
      give: { USDC: usdcGive },
      want: { PoolShare: divideBy(usdcGive, currShareWorth) },
    },
  });

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => vstorageClient.queryData(`published.${contractName}.poolMetrics`),
      ({ shareWorth }) =>
        !isGTE(currShareWorth.numerator, shareWorth.numerator),
      'share worth numerator increases from deposit',
    ),
  );
});

test.serial('advance and settlement', async t => {
  const {
    nobleTools,
    nobleAgoricChannelId,
    oracleWds,
    retryUntilCondition,
    useChain,
    usdcOnOsmosis,
    vstorageClient,
  } = t.context;

  // EUD wallet on osmosis
  const eudWallet = await createWallet(useChain('osmosis').chain.bech32_prefix);
  const eudAddress = (await eudWallet.getAccounts())[0].address;

  // parameterize agoric address
  const { settlementAccount } = await vstorageClient.queryData(
    `published.${contractName}`,
  );
  // TODO #10614 use bech32 encoding
  const recipientAddress = `${settlementAccount}?EUD=${eudAddress}`;
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

  const mintAmount = 800_000n;

  // TODO export CctpTxEvidence type
  const evidence = harden({
    blockHash:
      '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
    blockNumber: 21037663n,
    txHash: `0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617${makeRandomDigits(2n)}`,
    tx: {
      amount: mintAmount,
      forwardingAddress: userForwardingAddr,
    },
    aux: {
      forwardingChannel: nobleAgoricChannelId,
      recipientAddress,
    },
    chainId: 42161,
  });

  console.log('User initiates evm mint', evidence.txHash);

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
    await useChain('osmosis').getRestEndpoint(),
  );

  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => queryClient.queryBalance(eudAddress, usdcOnOsmosis),
      ({ balance }) => !!balance?.amount && BigInt(balance.amount) < mintAmount,
      `${eudAddress} advance available from fast-usdc`,
      {
        // this resolves quickly, so _decrease_ the interval so the timing is more apparent
        retryIntervalMs: 500,
      },
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
          console.log('tx status', txStatus);
          return txStatus === status;
        },
        `${evidence.txHash} is ${status}`,
      ),
    );

  await assertTxStatus('ADVANCED');
  console.log('Advance completed, waiting for mint...');

  nobleTools.mockCctpMint(mintAmount, userForwardingAddr);
  await t.notThrowsAsync(() =>
    retryUntilCondition(
      () => vstorageClient.queryData(`published.${contractName}.poolMetrics`),
      ({ encumberedBalance }) =>
        encumberedBalance && isEmpty(encumberedBalance),
      'encumberedBalance returns to 0',
    ),
  );

  await assertTxStatus('DISBURSED');
});

test.todo('lp withdraws and earns fees');
