import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
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
  osmosisSwapTools,
  type Prefix,
  type Channel,
  type SetupOsmosisContextWithCommon,
  type OsmosisPool,
} from './helpers.js';

const test = anyTest as TestFn<SetupOsmosisContextWithCommon>;

const accounts = ['agoricSender', 'agoricReceiver'];

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

const osmosisPoolList: OsmosisPool[] = [
  { issuingChain: 'cosmoshub', issuingDenom: 'uatom' },
    { issuingChain: 'agoric', issuingDenom: 'ubld' }
];

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  console.log('WALLETS', wallets);

  await startContract(contractName, contractBuilder, commonBuilderOpts);

  //@ts-expect-error missing swap tools
  t.context = { ...common, wallets };

  const swapTools = await osmosisSwapTools(t);
  const { setupXcsContracts, setupXcsState, setupOsmosisPools } = swapTools;

  await setupXcsContracts();
  await setupXcsState(prefixList, channelList);
  await setupOsmosisPools(osmosisPoolList);

  t.context = { ...t.context, ...swapTools };
});

test.serial('test osmosis xcs state', async t => {
  const { useChain, getContractsInfo, getXcsState, getPoolRoute, getPools } =
    t.context;

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

  // Verify if Pool was succefuly created
  const pool_route = await getPoolRoute(osmosisPoolList[0]);
  t.is(pool_route[0].token_out_denom, 'uosmo');

  // TODO: fix this assertion
  const pools = await getPools();
  t.assert(pools, 'No Osmosis Pool found');
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

  // TODO: check if agoricSender is sending the tx
  // check localTransfer method as well
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
  t.log(`agoric Receiver balances before: `, balancesBefore);

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

  const expectedHash = await getDenomHash('agoric', 'osmosis', 'uosmo');
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
    wallets.agoricReceiver,
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
  t.log(baseAddress);

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
  console.log('Transfer Args:', transferArgs);
  // TODO #9200 `sendIbcTokens` does not support `memo`
  // @ts-expect-error spread argument for concise code
  const txRes = await cosmosHubClient.sendIbcTokens(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(`failed to ibc transfer funds to ibc/${bldDenomOnHub}`);
  }
  const { events: _events, ...txRest } = txRes;
  console.log(txRest);
  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${orcContractReceiverAddress}`);

  const { balances: agoricReceiverBalances } = await retryUntilCondition(
    () => queryClient.queryBalances(wallets.agoricReceiver),
    ({ balances }) => {
      const balancesBeforeAmount = BigInt(balancesBefore[0]?.amount || 0);
      const currentBalanceAmount = BigInt(balances[0]?.amount || 0);
      return currentBalanceAmount > balancesBeforeAmount;
    },
    'Osmosis swap output reflected on Agoric receiver balance',
  );
  t.log(agoricReceiverBalances);

  const expectedHash = await getDenomHash('agoric', 'osmosis', 'uosmo');
  t.log('Expected denom hash:', expectedHash);

  t.regex(agoricReceiverBalances[0]?.denom, /^ibc/);
  t.is(
    agoricReceiverBalances[0]?.denom.split('ibc/')[1],
    expectedHash,
    'got expected ibc denom hash',
  );
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
  t.log(baseAddress);

  // local account balances
  const localOrchAccountBalancesBefore =
    await queryClient.queryBalances(baseAddress);
  // sender balances
  const senderBalancesBefore =
    await cosmosHubQueryClient.queryBalances(cosmosHubAddr);

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
  console.log('Transfer Args:', transferArgs);
  // TODO #9200 `sendIbcTokens` does not support `memo`
  // @ts-expect-error spread argument for concise code
  const txRes = await cosmosHubClient.sendIbcTokens(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(`failed to ibc transfer funds to ibc/${bldDenomOnHub}`);
  }
  const { events: _events, ...txRest } = txRes;
  console.log(txRest);
  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${orcContractReceiverAddress}`);

  // TODO; consider replacing with waitforcondition (baseAddress balance)
  await retryUntilCondition(
    () => queryClient.queryBalances(baseAddress),
    ({ balances }) => {
      return balances.length > 0;
    },
    'swap-anything balance reflected transferred tokens',
  );

  // local account balances
  const localOrchAccountBalancesAfter =
    await queryClient.queryBalances(baseAddress);
  // sender balances
  const senderBalancesAfter =
    await cosmosHubQueryClient.queryBalances(cosmosHubAddr);

  t.log(
    JSON.stringify(
      {
        localOrchAccountBalances: {
          before: localOrchAccountBalancesBefore,
          after: localOrchAccountBalancesAfter,
        },
        senderBalances: {
          before: senderBalancesBefore,
          after: senderBalancesAfter,
        },
      },
      null,
      2,
    ),
  );
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
