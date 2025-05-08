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
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeHttpClient } from '../../tools/makeHttpClient.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricSender', 'agoricReceiver'];

const contractName = 'swapAnything';
const contractBuilder =
  '../packages/builders/scripts/testing/init-swap-anything.js';

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
  // @ts-expect-error spread argument for concise code
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

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const setupXcsContracts = async t => {
  console.log('Setting XCS Contracts ...');
  const osmosisBranch = 'main';
  try {
    const scriptPath = path.resolve(dirname, '../../scripts/setup-xcs.sh');
    const { stdout } = await execa(scriptPath, [osmosisBranch]);
    console.log('setup-xcs script output:', stdout);
  } catch (error) {
    t.fail(`setup-xcs script failed with error: ${error}`);
  }
};

const createOsmosisPool = async t => {
  console.log('Creating Osmosis Pool ...');
  const tokenInDenom = 'ubld';
  const tokenInAmount = '250000';
  const tokenInWeight = '1';
  const tokenOutDenom = 'uosmo';
  const tokenOutAmount = '250000';
  const tokenOutWeight = '1';
  try {
    const scriptPath = path.resolve(
      dirname,
      '../../scripts/create-osmosis-pool.sh',
    );
    const { stdout } = await execa(scriptPath, [
      tokenInDenom,
      tokenInAmount,
      tokenInWeight,
      tokenOutDenom,
      tokenOutAmount,
      tokenOutWeight,
    ]);
    console.log('create-osmosis-pool  script output:', stdout);
  } catch (error) {
    t.fail(`create-osmosis-pool failed with error: ${error}`);
  }
};

const setupXcsChannelLink = async (t, chainA, chainB) => {
  console.log('Setting XCS Channel Links ...');
  try {
    const scriptPath = path.resolve(
      dirname,
      '../../scripts/setup-xcs-channel-link.sh',
    );
    const { stdout } = await execa(scriptPath, [chainA, chainB]);
    console.log('channel link setup output:', stdout);
  } catch (error) {
    t.fail(`channel link setup failed with error: ${error}`);
  }
};

const setupXcsPrefix = async t => {
  console.log('Setting XCS Prefixes ...');
  try {
    const scriptPath = path.resolve(
      dirname,
      '../../scripts/setup-xcs-prefix.sh',
    );
    const { stdout } = await execa(scriptPath);
    console.log('prefix setup output:', stdout);
  } catch (error) {
    t.fail(`prefix setup failed with error: ${error}`);
  }
};

const getXcsContractsAddress = async () => {
  const osmosisCLI =
    'kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c';

  const registryQuery = `${osmosisCLI} "jq -r '.crosschain_registry.address' /contract-info.json"`;
  const swaprouterQuery = `${osmosisCLI} "jq -r '.swaprouter.address' /contract-info.json"`;
  const swapQuery = `${osmosisCLI} "jq -r '.crosschain_swaps.address' /contract-info.json"`;

  const { stdout: registryAddress } = await execa(registryQuery, {
    shell: true,
  });
  const { stdout: swaprouterAddress } = await execa(swaprouterQuery, {
    shell: true,
  });
  const { stdout: swapAddress } = await execa(swapQuery, { shell: true });

  return { registryAddress, swaprouterAddress, swapAddress };
};

const getXcsState = async () => {
  const { registryAddress } = await getXcsContractsAddress();

  const osmosisExecQuery =
    'kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd query wasm contract-state smart';

  const channelObj = {
    get_channel_from_chain_pair: {
      source_chain: 'osmosis',
      destination_chain: 'agoric',
    },
  };
  const channelJson = `'${JSON.stringify(channelObj)}'`;
  const channelQuery = `${osmosisExecQuery} ${registryAddress} ${channelJson}`;

  const { stdout: channel } = await execa(channelQuery, {
    shell: true,
  });

  const prefixObj = {
    get_bech32_prefix_from_chain_name: {
      chain_name: 'osmosis',
    },
  };
  const prefixJson = `'${JSON.stringify(prefixObj)}'`;
  const prefixQuery = `${osmosisExecQuery} ${registryAddress} ${prefixJson}`;

  const { stdout: prefix } = await execa(prefixQuery, {
    shell: true,
  });

  const channelData = JSON.parse(channel).data;
  const prefixData = JSON.parse(prefix).data;

  return { channelData, prefixData };
};

const getPoolRoute = async () => {
  const { swaprouterAddress } = await getXcsContractsAddress();

  const osmosisExecQuery =
    'kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd query wasm contract-state smart';

  const routeObj = {
    get_route: {
      input_denom:
        'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
      output_denom: 'uosmo',
    },
  };
  const routeJson = `'${JSON.stringify(routeObj)}'`;
  const routeQuery = `${osmosisExecQuery} ${swaprouterAddress} ${routeJson}`;

  const { stdout } = await execa(routeQuery, {
    shell: true,
  });

  const routeData = JSON.parse(stdout).data;
  const route = routeData.pool_route[routeData.pool_route.length - 1];

  return route;
};

const getPool = async poolId => {
  const osmosisExec =
    'kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd';

  const poolQuery = `${osmosisExec} query gamm pool ${poolId}`;

  const { stdout } = await execa(poolQuery, {
    shell: true,
  });

  const pool = JSON.parse(stdout).pool;

  return pool;
};

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
  // @ts-expect-error type
  t.context = { ...common, wallets, waitForBlock };
  await startContract(contractName, contractBuilder, commonBuilderOpts);
  await setupXcsContracts(t);
  await createOsmosisPool(t);
  await setupXcsChannelLink(t, 'agoric', 'osmosis');
  await setupXcsPrefix(t);
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
  const osmosisChainId = useChain('osmosis').chain.chain_id;
  const {
    transferChannel: { channelId },
  } = starshipChainInfo.agoric.connections[osmosisChainId];

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
      callPipe: [['makeSendInvitation']],
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
      callPipe: [['makeSendInvitation']],
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
  } = starshipChainInfo.agoric.connections[cosmosChainId];

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
