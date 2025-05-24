import {
  createFundedWalletAndClient,
  makeIBCTransferMsg,
} from '../../tools/ibc-transfer.js';
import { Random } from '@cosmjs/crypto';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMnemonic } from '../../tools/wallet.js';
import { SigningStargateClient } from '@cosmjs/stargate';

export const fundRemote = async (
  t,
  destinationChain,
  denomToTransfer = 'ubld',
  amount = 100000000n,
) => {
  const { retryUntilCondition, useChain } = t.context;
  const {
    now = Date.now, // XXX #10038: injection optional, for now; TODO: add to t.context
    getBytes = Random.getBytes,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  }: {
    now?: () => number;
    getBytes?: (n: number) => Uint8Array;
    connectWithSigner?: typeof import('@cosmjs/stargate').SigningStargateClient.connectWithSigner;
  } = t.context;
  const { client, address, wallet } = await createFundedWalletAndClient(
    t.log,
    destinationChain,
    useChain,
    generateMnemonic(getBytes),
    connectWithSigner,
  );
  const balancesResult = await retryUntilCondition(
    () => client.getAllBalances(address),
    coins => !!coins?.length,
    `Faucet balances found for ${address}`,
  );
  console.log('Balances:', balancesResult);

  const { client: agoricClient, address: agoricAddress } =
    await createFundedWalletAndClient(
      t.log,
      'agoric',
      useChain,
      generateMnemonic(getBytes),
      connectWithSigner,
    );

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
    now(),
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

export const setupXcsContracts = async t => {
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

export const createOsmosisPool = async t => {
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

export const setupXcsChannelLink = async (t, chainA, chainB) => {
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

export const setupXcsPrefix = async t => {
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

export const getXcsContractsAddress = async () => {
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

export const getXcsState = async () => {
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

export const getPoolRoute = async () => {
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

export const getPool = async poolId => {
  const osmosisExec =
    'kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd';

  const poolQuery = `${osmosisExec} query gamm pool ${poolId}`;

  const { stdout } = await execa(poolQuery, {
    shell: true,
  });

  const pool = JSON.parse(stdout).pool;

  return pool;
};
