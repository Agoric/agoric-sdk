import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, type SetupContextWithWallets } from '../support.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { createFundedWalletAndClient, makeFundAndTransfer, makeIBCTransferMsg } from '../../tools/ibc-transfer.js';
import { makeQueryClient } from '../../tools/query.js';
import starshipChainInfo from '../../starship-chain-info.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricSender', 'agoricReceiver'];

const contractName = 'payments';
const contractBuilder = '../packages/payments/scripts/init-payments.js';

const otherContractName = 'otherContract';
const otherContractBuilder = '../packages/payments/scripts/init-other.js';

const fundRemote = async (
  t,
  destinationChain,
  denomToTransfer = 'ubld',
  amount = 100000000n,
) => {
  const { retryUntilCondition, useChain } = t.context;

  const { client, address, wallet } = await createFundedWalletAndClient(
    t.log,
    destinationChain,
    useChain,
  );
  const balancesResult = await retryUntilCondition(
    () => client.getAllBalances(address),
    coins => !!coins?.length,
    `Faucet balances found for ${address}`,
  );
  console.log('Balances:', balancesResult);

  const { client: agoricClient, address: agoricAddress } =
    await createFundedWalletAndClient(t.log, 'agoric', useChain);

  const balancesResultAg = await retryUntilCondition(
    () => agoricClient.getAllBalances(agoricAddress),
    coins => !!coins?.length,
    `Faucet balances found for ${agoricAddress}`,
  );
  console.log('Balances AGORIC:', balancesResultAg);

  const transferArgs = makeIBCTransferMsg(
    { denom: denomToTransfer, value: amount },
    { address, chainName: destinationChain },
    { address: agoricAddress, chainName: 'agoric' },
    Date.now(),
    useChain,
  );
  console.log('Transfer Args:', transferArgs);
  // TODO #9200 `sendIbcTokens` does not support `memo`
  const txRes = await agoricClient.sendIbcTokens(...transferArgs);
  if (txRes && txRes.code !== 0) {
    console.error(txRes);
    throw Error(`failed to ibc transfer funds to ${denomToTransfer}`);
  }
  const { events: _events, ...txRest } = txRes;
  console.log(txRest);
  t.is(txRes.code, 0, `Transaction succeeded`);
  t.log(`Funds transferred to ${agoricAddress}`);

  await retryUntilCondition(
    () => client.getAllBalances(address),
    coins => !!coins?.length,
    `${denomToTransfer} transferred to ${address}`,
  );

  return {
    client,
    address,
    wallet,
  };
};

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  console.log('WALLETS', wallets);
  t.context = { ...common, wallets };
  console.log('starting payments contract');
  await startContract(contractName, contractBuilder, commonBuilderOpts, { skipInstanceCheck: true });
  console.log('starting other contract');
  await startContract(
    otherContractName,
    otherContractBuilder,
    commonBuilderOpts,
    { skipInstanceCheck: false }
  );
});

test.serial.skip('check-vstorage-for-local-account', async t => {
  const { vstorageClient } = t.context;

  const {
    hookAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.SwapMachine-alpha');
  t.regex(baseAddress, /^agoric1/, 'LOA address is valid');
});

test.serial.only('check-others-contract', async t => {
  const { vstorageClient, retryUntilCondition, useChain } = t.context;

  const fundAndTransfer = makeFundAndTransfer(
    t,
    retryUntilCondition,
    useChain,
  );

  const {
    otherLcaBase: { value: baseAddress },
  } = await vstorageClient.queryData('published.otherContract');
  t.regex(baseAddress, /^agoric1/, 'LOA address is valid');

  // Encode addressHook
  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    foo: 'bar',
  }); 
  // Send uatom to it
  await fundAndTransfer('cosmoshub', orcContractReceiverAddress, 99n);

  // Check vstroage
  const latestTransfer = await vstorageClient.queryData('published.otherContract.latestTransfer');
  t.log(latestTransfer);

  const { origReceiver: receiverFromStorage } = latestTransfer;
  t.is(receiverFromStorage, orcContractReceiverAddress);
});

test.serial.skip('check-ubld-to-other', async t => {
  const { vstorageClient, useChain } = t.context;
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

  const { hash: bldDenomOnHub } = await cosmosHubQueryClient.queryDenom(
    `transfer/${counterPartyChannelId}`,
    'ubld',
  );
  t.log({ bldDenomOnHub, counterPartyChannelId });

  const {
    otherLcaBase: { value: baseAddress },
  } = await vstorageClient.queryData('published.otherContract');
  t.regex(baseAddress, /^agoric1/, 'LOA address is valid');

  // Encode addressHook
  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    foo: 'bar',
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
})

test.skip('WIP', async t => {
  const { wallets, vstorageClient, useChain } = t.context;
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

  const { hash: bldDenomOnHub } = await cosmosHubQueryClient.queryDenom(
    `transfer/${counterPartyChannelId}`,
    'ubld',
  );
  t.log({ bldDenomOnHub, counterPartyChannelId });

  const {
    hookAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.SwapMachine-alpha');

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    dex: 'osmo17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9jfksztgw5uh69wac2pgs5yczr8',
    finalReceiver: wallets.agoricReceiver, // other addr here
    swapOutDenom: 'uosmo',
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

  const latestTransfer = await vstorageClient.queryData('published.otherContract.latestTransfer');
  t.log(latestTransfer);
});

test.skip('WIP-pickup from here', async t => {
  const { wallets, vstorageClient, useChain } = t.context;
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

  const { hash: bldDenomOnHub } = await cosmosHubQueryClient.queryDenom(
    `transfer/${counterPartyChannelId}`,
    'ubld',
  );
  t.log({ bldDenomOnHub, counterPartyChannelId });

  const {
    hookAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.SwapMachine-alpha');

  const {
    otherLcaBase: { value: otherContractAddress },
  } = await vstorageClient.queryData('published.otherContract');

    // Encode addressHook
  const otherContractAddressEncoded = encodeAddressHook(otherContractAddress, {
    foo: 'bar',
  }); 

  const orcContractReceiverAddress = encodeAddressHook(baseAddress, {
    dex: 'osmo17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9jfksztgw5uh69wac2pgs5yczr8',
    finalReceiver: otherContractAddressEncoded, // other addr here
    swapOutDenom: 'uosmo',
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

  const latestTransfer = await vstorageClient.queryData('published.otherContract.latestTransfer');
  t.log(latestTransfer);
});
