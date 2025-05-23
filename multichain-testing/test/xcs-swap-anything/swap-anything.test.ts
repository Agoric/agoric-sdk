import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeBlockTool, makeDoOffer } from '../../tools/e2e-tools.js';
import { commonSetup } from '../support.js';
import { makeQueryClient } from '../../tools/query.js';
import starshipChainInfo from '../../starship-chain-info.js';
import { createFundedWalletAndClient } from '../../tools/ibc-transfer.js';
import { makeHttpClient } from '../../tools/makeHttpClient.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import {
  osmosisSwapTools,
  type SetupOsmosisContextWithCommon,
} from './helpers.js';
import type { Pool } from 'osmojs/osmosis/gamm/v1beta1/balancerPool.js';

const test = anyTest as TestFn<SetupOsmosisContextWithCommon>;

const accounts = ['agoricSender', 'agoricReceiver'];

const contractName = 'swapAnything';
const contractBuilder =
  '../packages/builders/scripts/testing/init-swap-anything.js';

const prefixList = [
  { chain: 'agoric', prefix: 'agoric' },
  { chain: 'osmosis', prefix: 'osmo' },
  { chain: 'cosmoshub', prefix: 'cosmos' },
];

const channelList = [
  { primary: 'osmosis', counterParty: 'agoric' },
  { primary: 'osmosis', counterParty: 'cosmoshub' },
  { primary: 'agoric', counterParty: 'cosmoshub' },
];

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  const { waitForBlock } = makeBlockTool({
    rpc: makeHttpClient('http://localhost:26657', fetch),
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
  });
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  console.log('WALLETS', wallets);

  await startContract(contractName, contractBuilder, commonBuilderOpts);

  // @ts-expect-error type
  t.context = { ...common, wallets, waitForBlock };

  const swapTools = await osmosisSwapTools(t);
  const { setupXcsContracts, setupXcsState, setupNewPool } = swapTools;

  await setupXcsContracts();
  await setupXcsState(prefixList, channelList);
  await setupNewPool();

  t.context = { ...t.context, ...swapTools };
});

test.serial('test osmosis xcs state', async t => {
  const { useChain, getContractsInfo, getXcsState, getPoolRoute, getPools } =
    t.context;

  // verify if Osmosis XCS contracts were instantiated
  const { swaprouter, crosschain_registry, crosschain_swaps } =
    await getContractsInfo();
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
  const agoricChainId = useChain('agoric').chain.chain_id;
  const {
    transferChannel: { channelId },
  } = starshipChainInfo.osmosis.connections[agoricChainId];

  const { channel, prefix } = await getXcsState();

  t.is(prefix, 'osmo');
  t.is(channel, channelId);

  // Verify if Pool was succefuly created
  const pool_route = await getPoolRoute('agoric', 'ubld');
  t.is(pool_route[0].token_out_denom, 'uosmo');

  const { numPools } = await getPools();
  t.assert(numPools > 0n, 'No Osmosis Pool found');
});

test.only('create non-native pool', async t => {
  const {
    setupNonNativePool,
    getPools,
    getPoolRouteNew,
    getPool,
    getDenomHash,
  } = t.context;

  const poolNumberBefore = await getPools();

  const chainA = { chain: 'cosmoshub', denom: 'uatom', amount: '100000' };
  const chainB = { chain: 'agoric', denom: 'ubld', amount: '100000' };

  await setupNonNativePool(chainA, chainB);

  const poolNumberAfter = await getPools();

  t.is(poolNumberBefore.numPools + 1n, poolNumberAfter.numPools);

  const route = await getPoolRouteNew(
    { chain: 'cosmoshub', denom: 'uatom' },
    { chain: 'agoric', denom: 'ubld' },
  );

  t.log(route);

  const [pool, chainADenomHash, chainBDenomHash] = await Promise.all([
    getPool(BigInt(route[0].pool_id)),
    getDenomHash('osmosis', chainA.chain, chainA.denom),
    getDenomHash('osmosis', chainB.chain, chainB.denom),
  ]);
  t.log(pool);

  t.is(route[0].token_out_denom, `ibc/${chainBDenomHash}`);

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
});

test.serial('BLD for OSMO, receiver on Agoric', async t => {
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

  const osmosisChainId = useChain('osmosis').chain.chain_id;

  const {
    transferChannel: { channelId },
  } = starshipChainInfo.agoric.connections[osmosisChainId];

  const { crosschain_swaps } = await getContractsInfo();

  const doOffer = makeDoOffer(wdUser);

  // Verify deposit
  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 125n);
  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

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
      // TODO: get the contract address dynamically
      destAddr: crosschain_swaps.address,
      receiverAddr: wallets.agoricReceiver,
      outDenom: 'uosmo',
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const { balances: agoricReceiverBalances } = await retryUntilCondition(
    () => queryClient.queryBalances(wallets.agoricReceiver),
    ({ balances }) => {
      const balancesBeforeAmount = BigInt(balancesBefore[0]?.amount || 0);
      const currentBalanceAmount = BigInt(balances[0]?.amount || 0);
      return currentBalanceAmount > balancesBeforeAmount;
    },
    'Deposit reflected in localOrchAccount balance',
  );
  t.log(agoricReceiverBalances);

  const { hash: expectedHash } = await queryClient.queryDenom(
    `transfer/${channelId}`,
    'uosmo',
  );

  t.log('Expected denom hash:', expectedHash);

  t.regex(agoricReceiverBalances[0]?.denom, /^ibc/);
  t.is(
    agoricReceiverBalances[0]?.denom.split('ibc/')[1],
    expectedHash,
    'got expected ibc denom hash',
  );
});

test.serial('OSMO for BLD, receiver on Agoric', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
  } = t.context;

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricReceiver;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const { crosschain_swaps } = await getContractsInfo();

  const doOffer = makeDoOffer(wdUser);

  // Verify deposit
  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).OSMO;
  const swapInAmount = AmountMath.make(bldBrand, 75n);
  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  const osmosisApiUrl = await useChain('osmosis').getRestEndpoint();
  const osmosisQueryClient = makeQueryClient(osmosisApiUrl);

  const agoricChainId = useChain('agoric').chain.chain_id;

  const {
    transferChannel: { channelId },
  } = starshipChainInfo.osmosis.connections[agoricChainId];

  const { hash: outDenomHash } = await osmosisQueryClient.queryDenom(
    `transfer/${channelId}`,
    'ubld',
  );

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
      // TODO: get the contract address dynamically
      destAddr: crosschain_swaps.address,
      receiverAddr: wallets.agoricReceiver,
      outDenom: `ibc/${outDenomHash}`,
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const { balances: agoricReceiverBalances } = await retryUntilCondition(
    () => queryClient.queryBalances(wallets.agoricReceiver),
    ({ balances }) => {
      const balancesBeforeAmount = BigInt(balancesBefore[0]?.amount || 0);
      const currentBalanceAmount = BigInt(balances[0]?.amount || 0);
      return currentBalanceAmount < balancesBeforeAmount;
    },
    'Deposit reflected in localOrchAccount balance',
  );
  t.log(agoricReceiverBalances);

  t.assert(
    BigInt(balancesBefore[0].amount) > BigInt(agoricReceiverBalances[0].amount),
  );
  t.assert(
    BigInt(balancesBefore[1].amount) < BigInt(agoricReceiverBalances[1].amount),
  );
});

test.serial('BLD for OSMO, receiver on CosmosHub', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
    getContractsInfo,
  } = t.context;

  const { client, address: cosmosAddress } = await createFundedWalletAndClient(
    t.log,
    'cosmoshub',
    useChain,
  );

  const balancesResult = await retryUntilCondition(
    () => client.getAllBalances(cosmosAddress),
    coins => !!coins?.length,
    `Faucet balances found for ${cosmosAddress}`,
  );
  console.log('Balances:', balancesResult);

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricSender;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const { crosschain_swaps } = await getContractsInfo();

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
      // TODO: get the contract address dynamically
      destAddr: crosschain_swaps.address,
      receiverAddr: cosmosAddress,
      outDenom: 'uosmo',
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const balancesResultAfter = await retryUntilCondition(
    () => client.getAllBalances(cosmosAddress),
    coins => coins?.length > 1,
    `Faucet balances found for ${cosmosAddress}`,
  );
  console.log('Balances:', balancesResultAfter);

  const cosmosChainId = useChain('cosmoshub').chain.chain_id;
  const {
    transferChannel: { channelId },
  } = starshipChainInfo.osmosis.connections[cosmosChainId];

  const apiUrl = await useChain('cosmoshub').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const { hash: expectedHash } = await queryClient.queryDenom(
    `transfer/${channelId}`,
    'uosmo',
  );

  t.log('Expected denom hash:', expectedHash);

  t.regex(balancesResultAfter[0]?.denom, /^ibc/);
  t.is(
    balancesResultAfter[0]?.denom.split('ibc/')[1],
    expectedHash,
    'got expected ibc denom hash',
  );
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

    const { crosschain_swaps } = await getContractsInfo();

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

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
