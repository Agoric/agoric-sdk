import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { makeBlockTool, makeDoOffer } from '../../tools/e2e-tools.js';
import { commonSetup, type SetupContextWithWallets } from '../support.js';
import { makeQueryClient } from '../../tools/query.js';
import starshipChainInfo from '../../starship-chain-info.js';
import {
  createFundedWalletAndClient,
  makeIBCTransferMsg,
} from '../../tools/ibc-transfer.js';
import { makeHttpClient } from '../../tools/makeHttpClient.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import {
  fundRemote,
  setupXcsContracts,
  createOsmosisPool,
  setupXcsChannelLink,
  setupXcsPrefix,
  getXcsContractsAddress,
  getXcsState,
  getPoolRoute,
  getPool,
} from './helpers.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricSender', 'agoricReceiver'];

const contractName = 'swapAnything';
const contractBuilder =
  '../packages/builders/scripts/testing/init-swap-anything.js';

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

  await setupXcsContracts(t);
  await createOsmosisPool(t);
  await setupXcsChannelLink(t, 'agoric', 'osmosis');
  await setupXcsPrefix(t);

  // @ts-expect-error type
  t.context = { ...common, wallets, waitForBlock };
});

test.serial('test osmosis xcs state', async t => {
  const { useChain } = t.context;

  // verify if Osmosis XCS contracts were instantiated
  const { registryAddress, swaprouterAddress, swapAddress } =
    await getXcsContractsAddress();
  t.assert(registryAddress, 'crosschain_registry contract address not found');
  t.assert(swaprouterAddress, 'swaprouter contract address not found');
  t.assert(swapAddress, 'crosschain_swaps contract address not found');

  // verify if Osmosis XCS State was modified
  const agoricChainId = useChain('agoric').chain.chain_id;
  const {
    transferChannel: { channelId },
  } = starshipChainInfo.osmosis.connections[agoricChainId];

  const { channelData, prefixData: osmosisPrefix } = await getXcsState();

  t.is(osmosisPrefix, 'osmo');
  t.is(channelData, channelId);

  const { pool_id, token_out_denom } = await getPoolRoute();
  t.is(token_out_denom, 'uosmo');

  // verify if Osmosis pool was created
  const pool = await getPool(pool_id);
  t.assert(pool);
});

test.serial('BLD for OSMO, receiver on Agoric', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
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

  const { swapAddress } = await getXcsContractsAddress();

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
      destAddr: swapAddress,
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
  } = t.context;

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricReceiver;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const { swapAddress } = await getXcsContractsAddress();

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
      destAddr: swapAddress,
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
  } = t.context;

  const { client, address } = await createFundedWalletAndClient(
    t.log,
    'cosmoshub',
    useChain,
  );

  const balancesResult = await retryUntilCondition(
    () => client.getAllBalances(address),
    coins => !!coins?.length,
    `Faucet balances found for ${address}`,
  );
  console.log('Balances:', balancesResult);

  await setupXcsChannelLink(t, 'osmosis', 'cosmoshub');

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.agoricSender;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 1000n,
    IST: 1000n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const { swapAddress } = await getXcsContractsAddress();

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
      destAddr: swapAddress,
      receiverAddr: address,
      outDenom: 'uosmo',
      slippage: { slippagePercentage: '20', windowSeconds: 10 },
      onFailedDelivery: 'do_nothing',
    },
    proposal: { give: { Send: swapInAmount } },
  });

  const balancesResultAfter = await retryUntilCondition(
    () => client.getAllBalances(address),
    coins => coins?.length > 1,
    `Faucet balances found for ${address}`,
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

    const { swapAddress } = await getXcsContractsAddress();

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
        destAddr: swapAddress,
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

test.serial('BLD for OSMO, receiver chain not registered to XCS, should throw', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
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

  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const bldBrand = Object.fromEntries(brands).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 125n);
  const { balance: bldBalanceBefore } = await queryClient.queryBalance(
    agoricAddr,
    'ubld',
  );

  // Send swap offer
  const makeAccountOfferId = `swap-ubld-uosmo-${Date.now()}`;
  const updates = wdUser.offers.executeOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeSendInvitation']],
    },
    offerArgs: {
      // TODO: get the contract address dynamically
      destAddr:
        'osmo17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9jfksztgw5uh69wac2pgs5yczr8',
      receiverAddr: 'noble/noble1foo',
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
});

/**
 * UNTIL https://github.com/Agoric/BytePitchPartnerEng/issues/51, we are skipping this
 * until the ticket above is done
 */
test.skip('address hook - BLD for OSMO, receiver on Agoric', async t => {
  const { wallets, vstorageClient, retryUntilCondition, useChain } = t.context;
  const { getRestEndpoint, chain: cosmosChain } = useChain('cosmoshub');

  const { address: cosmosHubAddr, client: cosmosHubClient } = await fundRemote(
    t,
    'cosmoshub',
  );

  const cosmosHubApiUrl = await getRestEndpoint();
  const cosmosHubQueryClient = makeQueryClient(cosmosHubApiUrl);

  const {
    transferChannel: { counterPartyChannelId },
  } = starshipChainInfo.agoric.connections[cosmosChain.chain_id];

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const { balances: balancesBefore } = await queryClient.queryBalances(
    wallets.agoricReceiver,
  );

  const { hash: bldDenomOnHub } = await cosmosHubQueryClient.queryDenom(
    `transfer/${counterPartyChannelId}`,
    'ubld',
  );
  t.log({ bldDenomOnHub, counterPartyChannelId });

  const {
    sharedLocalAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.swap-anything');
  t.log(baseAddress);

  const { swapAddress } = await getXcsContractsAddress();

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    destAddr: swapAddress,
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

  const osmosisChainId = useChain('osmosis').chain.chain_id;

  const {
    transferChannel: { channelId },
  } = starshipChainInfo.agoric.connections[osmosisChainId];

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

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
