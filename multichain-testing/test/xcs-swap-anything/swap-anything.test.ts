import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeDoOffer } from '../../tools/e2e-tools.js';
import { commonSetup } from '../support.js';
import { makeQueryClient } from '../../tools/query.js';
import starshipChainInfo from '../../starship-chain-info.js';
import {
  createFundedWalletAndClient,
  makeIBCTransferMsg,
} from '../../tools/ibc-transfer.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import {
  makeOsmosisSwapTools,
  type Prefix,
  type Channel,
  type SetupOsmosisContextWithCommon,
  type Pair,
  type SwapParty,
  makeWaitUntilIbcTransfer,
} from './helpers.js';
import type { Pool } from 'osmojs/osmosis/gamm/v1beta1/balancerPool.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';

const test = anyTest as TestFn<SetupOsmosisContextWithCommon>;

const accounts = ['agoricSender', 'agoricReceiver', 'otherReceiver'];

const contractName = 'swapAnything';
const contractBuilder =
  '../packages/builders/scripts/testing/init-swap-anything.js';

const prefixList: Prefix[] = [
  { chain: 'agoric', prefix: 'agoric' },
  { chain: 'osmosis', prefix: 'osmo' },
  { chain: 'cosmoshub', prefix: 'cosmos' },
];

const channelList: Channel[] = [
  { primary: 'agoric', counterParty: 'osmosis' },
  { primary: 'agoric', counterParty: 'cosmoshub' },
  { primary: 'cosmoshub', counterParty: 'osmosis' },
];

const osmosisPoolList: Pair[] = [
  {
    tokenA: { chain: 'agoric', denom: 'ubld', amount: '10000000' },
    tokenB: { chain: 'osmosis', denom: 'uosmo', amount: '10000000' },
  },
  {
    tokenA: { chain: 'cosmoshub', denom: 'uatom', amount: '10000000' },
    tokenB: { chain: 'osmosis', denom: 'uosmo', amount: '10000000' },
  },
  {
    tokenA: { chain: 'cosmoshub', denom: 'uatom', amount: '10000000' },
    tokenB: { chain: 'agoric', denom: 'ubld', amount: '10000000' },
  },
];

const pfmEnabledChains: SwapParty[] = [
  { chain: 'cosmoshub', denom: 'uatom' },
  { chain: 'agoric', denom: 'ubld' },
];

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.log('setupTestKeys:', wallets);

  await startContract(contractName, contractBuilder, commonBuilderOpts);

  //@ts-expect-error missing swap tools
  t.context = { ...common, wallets };
  const swapTools = await makeOsmosisSwapTools(t);
  t.context = { ...t.context, ...swapTools };
});

test.serial('setup XCS', async t => {
  const {
    setupXcsContracts,
    setupXcsState,
    setupPoolsInBatch,
    enablePfmInBatch,
  } = t.context;

  await setupXcsContracts();
  await setupXcsState(prefixList, channelList);
  await setupPoolsInBatch(osmosisPoolList);

  await enablePfmInBatch(pfmEnabledChains);
  t.pass();
});

test.serial('test osmosis xcs state', async t => {
  const {
    useChain,
    getContractsInfo,
    getXcsState,
    getPoolRoute,
    getPools,
    getPool,
    getDenomHash,
    hasPacketForwarding,
  } = t.context;

  // verify if Osmosis XCS contracts were instantiated
  const { swaprouter, crosschain_registry, crosschain_swaps } =
    getContractsInfo();
  t.assert(swaprouter.address, 'swaprouter contract address not found');
  t.assert(
    crosschain_registry.address,
    'crosschain_registry contract address not found',
  );
  t.assert(
    crosschain_swaps.address,
    'crosschain_swaps contract address not found',
  );

  // verify if Osmosis XCS State was modified
  const chainId = useChain('osmosis').chain.chain_id;
  const { transferChannel } = starshipChainInfo.agoric.connections[chainId];

  const { channelId, prefix } = await getXcsState(channelList[0]);

  t.is(prefix, 'osmo');
  t.is(channelId, transferChannel.channelId);

  // Verify if Pool was successfully created
  const pool_route = await getPoolRoute(
    { chain: 'agoric', denom: 'ubld' },
    { chain: 'osmosis', denom: 'uosmo' },
  );
  t.is(pool_route[0].token_out_denom, 'uosmo');

  const { numPools } = await getPools();
  t.assert(numPools > 0n, 'No Osmosis Pool found');

  // Check non-native pool
  const { tokenA, tokenB } = osmosisPoolList[2];
  const nonNativeRoute = await getPoolRoute(tokenA, tokenB);

  const [pool, chainADenomHash, chainBDenomHash] = await Promise.all([
    getPool(BigInt(nonNativeRoute[0].pool_id)),
    getDenomHash('osmosis', tokenA.chain, tokenA.denom),
    getDenomHash('osmosis', tokenB.chain, tokenB.denom),
  ]);

  t.is(nonNativeRoute[0].token_out_denom, `ibc/${chainBDenomHash}`);

  const myPool = pool.pool as Pool;
  t.truthy(
    myPool.poolAssets.find(
      ({ token }) => token.denom === `ibc/${chainADenomHash}`,
    ),
  );
  t.truthy(
    myPool.poolAssets.find(
      ({ token }) => token.denom === `ibc/${chainBDenomHash}`,
    ),
  );
  // good for debugging
  const cosmoshubPfm = await hasPacketForwarding('cosmoshub');
  const agoricPfm = await hasPacketForwarding('agoric');
  t.log('PFM Proposed', { cosmoshubPfm, agoricPfm });
});

test.serial('BLD for OSMO, receiver on Agoric', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
    getDenomHash,
  } = t.context;

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricSender;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });

  // Verify deposit
  await retryUntilCondition(
    () => queryClient.queryBalances(agoricAddr),
    ({ balances }) => {
      const balance = BigInt(balances[0]?.amount || 0);
      return balance > 125n;
    },
    'agoricSender wallet not provisioned',
  );
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  // Send swap offer

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 125n);
  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  // Send swap offer
  const doOffer = makeDoOffer(wdUser);

  const { crosschain_swaps } = getContractsInfo();

  const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;

  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeSwapInvitation']],
    },
    offerArgs: {
      destAddr: crosschain_swaps.address,
      receiverAddr: wallets.agoricReceiver,
      outDenom: 'uosmo',
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const waitUntilIbcTransfer = makeWaitUntilIbcTransfer(
    queryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransfer(wallets.agoricReceiver, balancesBefore, {
    currentChain: 'agoric',
    issuerChain: 'osmosis',
    denom: 'uosmo',
  });

  const offerResult = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}`),
    ({ status }) =>
      status.id === makeAccountOfferId &&
      status.result &&
      status.error === undefined,
    `${makeAccountOfferId} offer result is in vstorage`,
  );

  t.is(offerResult.status.result, 'transfer complete, seat exited');
});

// FLAKE: fails when run in isolation (.only)
test.serial('OSMO for BLD, receiver on Agoric', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
    getDenomHash,
  } = t.context;

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricReceiver;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });

  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const doOffer = makeDoOffer(wdUser);

  // Verify deposit
  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).OSMO;
  const swapInAmount = AmountMath.make(bldBrand, 75n);
  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.otherReceiver,
  );

  const outDenomHash = await getDenomHash('osmosis', 'agoric', 'ubld');

  const { crosschain_swaps } = getContractsInfo();

  // Send swap offer
  const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;
  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeSwapInvitation']],
    },
    offerArgs: {
      destAddr: crosschain_swaps.address,
      receiverAddr: wallets.otherReceiver,
      outDenom: `ibc/${outDenomHash}`,
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  await retryUntilCondition(
    async () => queryClient.queryBalance(wallets.otherReceiver, 'ubld'),
    bldBalance => {
      const bldBalanceBefore = balancesBefore.find(
        ({ denom }) => denom === 'ubld',
      );
      const bldAmount = BigInt(bldBalance.balance?.amount as string);

      if (!bldBalanceBefore && bldAmount > 0) return true;
      if (bldBalanceBefore) return bldAmount > BigInt(bldBalanceBefore.amount);
      else return false;
    },
    'BLD not received by the receiver',
  );

  const offerResult = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}`),
    ({ status }) =>
      status.id === makeAccountOfferId &&
      status.result &&
      status.error === undefined,
    `${makeAccountOfferId} offer result is in vstorage`,
  );

  t.is(offerResult.status.result, 'transfer complete, seat exited');
});

test.serial('BLD for OSMO, receiver on CosmosHub', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
    getDenomHash,
  } = t.context;

  const { client, address: cosmosAddress } = await createFundedWalletAndClient(
    t.log,
    'cosmoshub',
    useChain,
  );

  const balancesBefore = await retryUntilCondition(
    () => client.getAllBalances(cosmosAddress),
    coins => !!coins?.length,
    `Faucet balances found for ${cosmosAddress}`,
  );

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricSender;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const { crosschain_swaps } = getContractsInfo();

  const doOffer = makeDoOffer(wdUser);

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 125n);

  // Send swap offer
  const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;
  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeSwapInvitation']],
    },
    offerArgs: {
      destAddr: crosschain_swaps.address,
      receiverAddr: cosmosAddress,
      outDenom: 'uosmo',
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const apiUrl = await useChain('cosmoshub').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const waitUntilIbcTransfer = makeWaitUntilIbcTransfer(
    queryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransfer(cosmosAddress, balancesBefore, {
    currentChain: 'cosmoshub',
    issuerChain: 'osmosis',
    denom: 'uosmo',
  });

  const offerResult = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}`),
    ({ status }) =>
      status.id === makeAccountOfferId &&
      status.result &&
      status.error === undefined,
    `${makeAccountOfferId} offer result is in vstorage`,
  );

  t.is(offerResult.status.result, 'transfer complete, seat exited');
});

test.serial(
  'BLD for OSMO, receiver chain not registered to XCS, should throw',
  async t => {
    const {
      wallets,
      provisionSmartWallet,
      vstorageClient,
      retryUntilCondition,
      useChain,
      getContractsInfo,
    } = t.context;

    // Provision the Agoric smart wallet
    const agoricAddr = wallets.agoricSender;
    const wdUser = await provisionSmartWallet(agoricAddr, {
      BLD: 1000n,
      IST: 1000n,
    });
    t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

    const apiUrl = await useChain('agoric').getRestEndpoint();
    const queryClient = makeQueryClient(apiUrl);

    const brands = await vstorageClient.queryData(
      'published.agoricNames.brand',
    );
    const bldBrand = Object.fromEntries(brands).BLD;
    const swapInAmount = AmountMath.make(bldBrand, 125n);
    const { balance: bldBalanceBefore } = await queryClient.queryBalance(
      agoricAddr,
      'ubld',
    );

    const { crosschain_swaps } = getContractsInfo();

    // Send swap offer
    const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;
    const updates = wdUser.offers.executeOffer({
      id: makeAccountOfferId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeSwapInvitation']],
      },
      offerArgs: {
        destAddr: crosschain_swaps.address,
        receiverAddr: 'noble/noble1foo', // bad swap receiver
        outDenom: 'uosmo',
        slippage: { slippagePercentage: '20', windowSeconds: 10 },
        onFailedDelivery: 'do_nothing',
      },
      proposal: { give: { Send: swapInAmount } },
    });

    const {
      // @ts-expect-error types
      value: {
        status: { error: errorMsg },
      },
    } = await retryUntilCondition(
      // Prevent test from hanging when no new values are coming from updates.next()
      () =>
        Promise.race([
          updates.next(),
          new Promise(resolve =>
            setTimeout(async () => {
              await updates.return();
              resolve('Done');
            }, 5000),
          ),
        ]),
      (result: { value: { updated: string; status: OfferStatus } }) => {
        return result.value.status.error !== undefined;
      },
      'Offer result did not fail as expect ed',
    );

    const { balance: bldBalanceAfter } = await queryClient.queryBalance(
      agoricAddr,
      'ubld',
    );

    t.deepEqual(bldBalanceBefore, bldBalanceAfter);
    t.regex(errorMsg, /^Error: IBC Transfer failed/);
  },
);

test.serial('address hook - BLD for OSMO, receiver on Agoric', async t => {
  const {
    wallets,
    vstorageClient,
    retryUntilCondition,
    useChain,
    fundRemote,
    getDenomHash,
    getContractsInfo,
  } = t.context;

  const { address: cosmosHubAddr, client: cosmosHubClient } = await fundRemote(
    'agoric',
    'ubld',
    'cosmoshub',
  );

  const bldDenomOnHub = await getDenomHash('cosmoshub', 'agoric', 'ubld');

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  const {
    sharedLocalAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.swap-anything');

  const { crosschain_swaps } = getContractsInfo();

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    destAddr: crosschain_swaps.address,
    receiverAddr: wallets.agoricReceiver,
    outDenom: 'uosmo',
  });

  const transferArgs = makeIBCTransferMsg(
    { denom: `ibc/${bldDenomOnHub}`, value: 125n },
    { address: orcContractReceiverAddress, chainName: 'agoric' },
    { address: cosmosHubAddr, chainName: 'cosmoshub' },
    Date.now(),
    useChain,
  );

  const txRes = await cosmosHubClient.signAndBroadcast(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(`failed to ibc transfer funds to ibc/${bldDenomOnHub}`);
  }

  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${orcContractReceiverAddress}`);

  const waitUntilIbcTransfer = makeWaitUntilIbcTransfer(
    queryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransfer(wallets.agoricReceiver, balancesBefore, {
    currentChain: 'agoric',
    issuerChain: 'osmosis',
    denom: 'uosmo',
  });

  // test will fail if waitUntilIbcTransfer does not observe a balance increase
  t.pass();
});

test.serial('bad swapOut receiver, via addressHooks', async t => {
  const {
    vstorageClient,
    useChain,
    fundRemote,
    getDenomHash,
    getContractsInfo,
    retryUntilCondition,
  } = t.context;

  const { address: cosmosHubAddr, client: cosmosHubClient } = await fundRemote(
    'agoric',
    'ubld',
    'cosmoshub',
  );

  const bldDenomOnHub = await getDenomHash('cosmoshub', 'agoric', 'ubld');

  const cosmosHubApiUrl = await useChain('cosmoshub').getRestEndpoint();
  const cosmosHubQueryClient = makeQueryClient(cosmosHubApiUrl);

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const {
    sharedLocalAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.swap-anything');

  // local account balances
  const localOrchAccountBalancesBefore =
    await queryClient.queryBalances(baseAddress);
  // sender balances
  const senderBalancesBefore =
    await cosmosHubQueryClient.queryBalances(cosmosHubAddr);
  t.log(
    'local account balance before transfer: ',
    localOrchAccountBalancesBefore,
  );
  t.log('sender balance before transfer: ', senderBalancesBefore);

  const { crosschain_swaps } = getContractsInfo();

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    destAddr: crosschain_swaps.address,
    receiverAddr: 'noble/noble1foo', // bad receiver, should throw
    outDenom: 'uosmo',
  });

  const transferArgs = makeIBCTransferMsg(
    { denom: `ibc/${bldDenomOnHub}`, value: 125n },
    { address: orcContractReceiverAddress, chainName: 'agoric' },
    { address: cosmosHubAddr, chainName: 'cosmoshub' },
    Date.now(),
    useChain,
  );

  const txRes = await cosmosHubClient.signAndBroadcast(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(`failed to ibc transfer funds to ibc/${bldDenomOnHub}`);
  }
  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${orcContractReceiverAddress}`);

  await retryUntilCondition(
    () => queryClient.queryBalances(baseAddress),
    ({ balances }) => {
      return balances.length > 0;
    },
    'swap-anything balance reflected transferred tokens',
  );

  const localOrchAccountBalancesAfter =
    await queryClient.queryBalances(baseAddress);
  const senderBalancesAfter =
    await cosmosHubQueryClient.queryBalances(cosmosHubAddr);

  t.log(
    'local account balance after transfer: ',
    localOrchAccountBalancesAfter,
  );
  t.log('sender balance after transfer: ', senderBalancesAfter);

  const waitUntilIbcTransferCosmos = makeWaitUntilIbcTransfer(
    cosmosHubQueryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransferCosmos(
    cosmosHubAddr,
    senderBalancesAfter.balances,
    {
      currentChain: 'cosmoshub',
      issuerChain: 'agoric',
      denom: 'ubld',
    },
  );

  const localOrchAccountBalancesRecovery =
    await queryClient.queryBalances(baseAddress);
  const senderBalancesRecovery =
    await cosmosHubQueryClient.queryBalances(cosmosHubAddr);

  t.log(
    'local account balance after recovery: ',
    localOrchAccountBalancesRecovery,
  );
  t.log('sender balance after recovery: ', senderBalancesRecovery);
});

test.serial('native ATOM for Osmo using PFM, receiver on Agoric', async t => {
  const {
    wallets,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
    getDenomHash,
  } = t.context;

  const { client: cosmosHubClient, address: cosmosHubAddr } =
    await createFundedWalletAndClient(t.log, 'cosmoshub', useChain);

  await retryUntilCondition(
    () => cosmosHubClient.getAllBalances(cosmosHubAddr),
    coins => !!coins?.length,
    `Faucet balances found for ${cosmosHubAddr}`,
  );
  t.log(`Provisioned Cosmoshub smart wallet for ${cosmosHubAddr}`);

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  const {
    sharedLocalAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.swap-anything');

  const { crosschain_swaps } = getContractsInfo();

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    destAddr: crosschain_swaps.address,
    receiverAddr: wallets.agoricReceiver,
    outDenom: 'uosmo',
  });

  const transferArgs = makeIBCTransferMsg(
    { denom: `uatom`, value: 125n },
    { address: orcContractReceiverAddress, chainName: 'agoric' },
    { address: cosmosHubAddr, chainName: 'cosmoshub' },
    Date.now(),
    useChain,
  );

  const txRes = await cosmosHubClient.signAndBroadcast(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(
      `failed to ibc transfer funds to ${orcContractReceiverAddress}`,
    );
  }

  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${orcContractReceiverAddress}`);

  const waitUntilIbcTransfer = makeWaitUntilIbcTransfer(
    queryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransfer(wallets.agoricReceiver, balancesBefore, {
    currentChain: 'agoric',
    issuerChain: 'osmosis',
    denom: 'uosmo',
  });

  // test will fail if waitUntilIbcTransfer does not observe a balance increase
  t.pass();
});

test.serial('BLD for ATOM on Osmosis, receiver on Agoric', async t => {
  const {
    wallets,
    provisionSmartWallet,
    getDenomHash,
    retryUntilCondition,
    useChain,
    vstorageClient,
    getContractsInfo,
  } = t.context;

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const atomHashOnOsmosis = await getDenomHash('osmosis', 'cosmoshub', 'uatom');

  const agoricAddr = wallets.agoricSender;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });

  // Verify deposit
  await retryUntilCondition(
    () => queryClient.queryBalances(agoricAddr),
    ({ balances }) => {
      const balance = BigInt(balances[0]?.amount || 0);
      return balance > 125n;
    },
    'agoricSender wallet not provisioned',
  );
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  // Send swap offer
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 125n);
  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  // Send swap offer
  const doOffer = makeDoOffer(wdUser);

  const { crosschain_swaps } = getContractsInfo();

  const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;
  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeSwapInvitation']],
    },
    offerArgs: {
      destAddr: crosschain_swaps.address,
      receiverAddr: wallets.agoricReceiver,
      outDenom: `ibc/${atomHashOnOsmosis}`,
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const waitUntilIbcTransfer = makeWaitUntilIbcTransfer(
    queryClient,
    getDenomHash,
    retryUntilCondition,
  );
  await waitUntilIbcTransfer(wallets.agoricReceiver, balancesBefore, {
    currentChain: 'agoric',
    issuerChain: 'cosmoshub',
    denom: 'uatom',
  });

  const offerResult = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}`),
    ({ status }) =>
      status.id === makeAccountOfferId &&
      status.result &&
      status.error === undefined,
    `${makeAccountOfferId} offer result is in vstorage`,
  );

  t.is(offerResult.status.result, 'transfer complete, seat exited');
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
