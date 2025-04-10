import type { MinimalNetworkConfig } from '@agoric/client-utils';
import yaml from 'js-yaml';
import type fs from 'node:fs';

interface StarshipConfig {
  chains: [
    {
      id: string;
      ports: {
        rest: number;
        rpc: number;
        faucet: number;
      };
    },
  ];
}

export const readStarshipConfig = (
  configPath: string,
  { readFileSync }: { readFileSync: typeof fs.readFileSync },
): StarshipConfig => {
  const configFile = readFileSync(configPath, 'utf-8');
  return yaml.load(configFile);
};

export const extractNetworkConfig = (
  chainName: string,
  config: StarshipConfig,
) => {
  const chain = config.chains.find(c => c.id === chainName);
  if (!chain) {
    throw new Error(`Chain with id '${chainName}' not found`);
  }
  if (!chain.ports?.rpc) {
    throw new Error(`RPC port not found for '${chainName}'`);
  }
  if (!chain.ports?.rest) {
    throw new Error(`REST port not found for '${chainName}'`);
  }

  return {
    chainName,
    apiAddrs: [`http://0.0.0.0:${chain.ports.rest}`],
    rpcAddrs: [`http://0.0.0.0:${chain.ports.rpc}`],
  } satisfies MinimalNetworkConfig;
};
