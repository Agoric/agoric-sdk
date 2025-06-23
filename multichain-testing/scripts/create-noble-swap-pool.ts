#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */
import '@endo/init';
import { execa } from 'execa';
import { parseArgs } from 'node:util';
import { makeBlockTool } from '../tools/e2e-tools.js';
import { makeHttpClient } from '../tools/makeHttpClient.js';

const REGISTRY_API_URL = 'http://localhost:8081';
const POD_NAME = 'noblelocal-genesis-0';
const CONTAINER = 'validator';
const REQUIRED_ATLEAST_MAJOR = 10;
const NOBLE_CHAIN_ID = 'noblelocal';
const NOBLE_AUTHORITY_ADDRESS = 'noble13am065qmk680w86wya4u9refhnssqwcvgs0sfk';
const GENESIS_ACCOUNT = 'genesis';

async function checkNobleChainPresence(nobleChainId: string) {
  let resp;

  resp = await fetch(`${REGISTRY_API_URL}/chains/${nobleChainId}`);
  resp = await resp.json();

  // Incase nobleChainId not present/running, resp.chain_id will be undefined
  if (resp.chain_id !== nobleChainId) {
    console.log(
      `Noble chain with id ${nobleChainId} is not present or running.`,
    );
    return false;
  }
  const rpcUrl = resp.apis.rpc[0].address;
  const { waitForBlock } = makeBlockTool({
    rpc: makeHttpClient(rpcUrl, fetch),
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
  });
  await waitForBlock(1);
  return true;
}

async function getNobleVersion({
  pod,
  container,
}: {
  pod: string;
  container: string;
}) {
  const { stdout } = await execa('kubectl', [
    'exec',
    '-i',
    pod,
    '-c',
    container,
    '--',
    'nobled',
    'version',
    '--long',
    '--output',
    'json',
  ]);
  const info = JSON.parse(stdout);
  const sdkVer = info.version.replace(/^v/, ''); // Remove leading 'v' if present
  return sdkVer;
}

async function getSwapPools({
  pod,
  container,
}: {
  pod: string;
  container: string;
}) {
  const { stdout } = await execa('kubectl', [
    'exec',
    '-i',
    pod,
    '-c',
    container,
    '--',
    'nobled',
    'query',
    'swap',
    'pools',
    '--output',
    'json',
  ]);
  const data = JSON.parse(stdout);
  return data.pools;
}

async function pollSwapPools(
  pod: string,
  container: string,
  conditionToStopPolling: (swapPools) => boolean,
  intervalMs: number = 2000,
  timeoutMs: number = 30_000, // Wait for 30 seconds atmost
) {
  const start = Date.now();

  while (true) {
    const swapPools = await getSwapPools({ pod, container });
    if (conditionToStopPolling(swapPools)) {
      return swapPools;
    }

    const elapsed = Date.now() - start;
    if (elapsed >= timeoutMs) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for swapPools for pod=${pod}, container=${container}`,
      );
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

async function createPool({
  pod,
  container,
}: {
  pod: string;
  container: string;
}) {
  const { stdout: genJson } = await execa('kubectl', [
    'exec',
    '-i',
    pod,
    '-c',
    container,
    '--',
    'nobled',
    'tx',
    'swap',
    'stableswap',
    'create-pool',
    'uusdc',
    '0',
    '5',
    '1',
    '100',
    '100',
    '1000000000000000000uusdc',
    '1000000000000000000uusdn',
    '--chain-id',
    NOBLE_CHAIN_ID,
    '--generate-only',
    '--from',
    NOBLE_AUTHORITY_ADDRESS,
  ]);
  await execa(
    'kubectl',
    [
      'exec',
      '-i',
      pod,
      '-c',
      container,
      '--',
      'nobled',
      'tx',
      'authority',
      'execute',
      '-',
      '--from',
      GENESIS_ACCOUNT,
      '--chain-id',
      NOBLE_CHAIN_ID,
      '--keyring-backend',
      'test',
      '--gas',
      'auto',
      '--gas-adjustment',
      '1.4',
      '-b',
      'sync',
      '-y',
    ],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: genJson,
    },
  );
}

async function addLiquidity({
  pod,
  container,
  args,
}: {
  pod: string;
  container: string;
  args: {
    amount: { uusdc: string; uusdn: string };
    slippagePercentage: string;
    poolId: string;
  };
}) {
  await execa('kubectl', [
    'exec',
    '-i',
    pod,
    '-c',
    container,
    '--',
    'nobled',
    'tx',
    'swap',
    'stableswap',
    'add-liquidity',
    args.poolId,
    args.slippagePercentage,
    `${args.amount.uusdc}uusdc`,
    `${args.amount.uusdn}uusdn`,
    '--from',
    GENESIS_ACCOUNT,
    '--chain-id',
    NOBLE_CHAIN_ID,
    '--gas',
    'auto',
    '--gas-adjustment',
    '1.4',
    '-b',
    'sync',
    '-o',
    'json',
    '-y',
  ]);
}

async function main() {
  const { values } = parseArgs({
    options: {
      pod: { type: 'string', short: 'p' },
      container: { type: 'string', short: 'c' },
      help: { type: 'boolean', short: 'h' },
      chainId: { type: 'string', short: 'k' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`
Usage: create-noble-swap-pool.ts [options]

Options:
  -p, --pod        Pod name (default: ${POD_NAME})
  -c, --container  Container name (default: ${CONTAINER})
  -k --chain-id   Chain ID (default: ${NOBLE_CHAIN_ID})
`);
    process.exit(0);
  }

  const pod = values.pod ?? POD_NAME;
  const container = values.container ?? CONTAINER;
  const nobleChainId = values.chainId ?? NOBLE_CHAIN_ID;

  console.log('Doing Pre-Checks for Noble chain...');
  const hasNobleChain = await checkNobleChainPresence(nobleChainId);
  if (!hasNobleChain) return;

  const sdkVersion = await getNobleVersion({ pod, container });
  if (parseInt(sdkVersion) < REQUIRED_ATLEAST_MAJOR) {
    console.log(
      `noble sdk version ${sdkVersion} is less than required v${REQUIRED_ATLEAST_MAJOR}`,
    );
    return;
  }

  // Here, we are good to create swap pools
  let swapPools = await getSwapPools({ pod, container });

  // swapPools will be null if there are no pools
  if (swapPools) {
    console.log('Swap Pools Already exists', swapPools);
    return;
  }

  console.log('Creating swap pool...');
  await createPool({ pod, container });

  let conditionToStopPolling = pools =>
    Array.isArray(pools) && pools.length > 0;
  swapPools = await pollSwapPools(pod, container, conditionToStopPolling);
  console.log('Swap pool created successfuly...', swapPools);

  // Add liquidity in pool with uusdc and uusdn
  const args = {
    amount: { uusdc: '1000000000', uusdn: '1000000000' },
    slippagePercentage: '5',
    poolId: '0',
  };
  console.log('Adding liquidity to Noble swap pool...');
  await addLiquidity({ pod, container, args });

  // Poll for liquidity to be added in pool
  conditionToStopPolling = pools =>
    pools.length > 0 && pools[0].liquidity.length > 0;
  swapPools = await pollSwapPools(pod, container, conditionToStopPolling);
  console.log(`Liquidity added in pool ${args.poolId}`, swapPools[0].liquidity);
}

main().catch(err => {
  console.error('An error occurred while creating the swap pool:');
  console.error(err);
  process.exit(1);
});
