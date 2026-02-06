/** @file build privateArgsOverrides for main | devnet from static info */
import type { PortfolioPrivateArgs } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses as gmpConfigs,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { objectMap } from '@agoric/internal';
import type { CosmosChainInfo } from '@agoric/orchestration';
import { readFile as readFileAmbient } from 'fs/promises';
import { createRequire } from 'module';
import type { RunTools } from './wallet-admin-types.ts';

const WalletBytecodeModule =
  '@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json';
const chainInfoModules = {
  main: '@agoric/orchestration/src/fetched-chain-info.js',
  devnet: '@agoric/orchestration/src/fetched-chain-info-testnets.js',
};

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) =>
  readFileAmbient(nodeRequire.resolve(spec), 'utf8');

const netOfConfig = (c: { chainName: string }) =>
  c.chainName === 'agoric-3' ? 'main' : 'devnet';

const contractsForNetwork = {
  main: {
    axelarConfig: axelarConfigMainnet,
    gmpAddresses: gmpConfigs.mainnet,
  },
  devnet: {
    axelarConfig: axelarConfigTestnet,
    gmpAddresses: gmpConfigs.testnet,
  },
};

/**
 * Build privateArgsOverrides sufficient to add new EVM chains.
 */
const overridesForEthChainInfo = (
  cosmosChainInfo: Record<'agoric' | 'noble' | 'axelar', CosmosChainInfo>,
  net: 'main' | 'devnet',
  walletBytecode: `0x${string}`,
) => {
  const { axelarConfig, gmpAddresses } = contractsForNetwork[net];
  const chainInfo = {
    ...cosmosChainInfo,
    ...objectMap(axelarConfig, info => info.chainInfo),
  };

  const privateArgsOverrides: Pick<
    PortfolioPrivateArgs,
    'axelarIds' | 'contracts' | 'chainInfo' | 'gmpAddresses' | 'walletBytecode'
  > = harden({
    axelarIds: objectMap(axelarConfig, c => c.axelarId),
    contracts: objectMap(axelarConfig, c => c.contracts),
    chainInfo,
    gmpAddresses,
    walletBytecode,
  });
  return privateArgsOverrides;
};

const buildOverrides = async ({ scriptArgs, cwd, walletKit }: RunTools) => {
  const [outPath] = scriptArgs;
  if (!outPath) throw Error('Usage: missing OUTPATH arg');

  const net = netOfConfig(walletKit.networkConfig);

  const {
    default: { agoric, axelar, noble },
  } = await import(chainInfoModules[net]);
  const cosmosChainInfo = harden({ agoric, noble, axelar });

  const { bytecode } = JSON.parse(await asset(WalletBytecodeModule));

  const overrides = overridesForEthChainInfo(cosmosChainInfo, net, bytecode);

  await cwd.join(outPath).writeText(JSON.stringify(overrides));
};
export default buildOverrides;
