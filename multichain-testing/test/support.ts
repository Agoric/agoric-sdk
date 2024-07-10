import type { ExecutionContext } from 'ava';
import { dirname, join } from 'path';
import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';
import { makeAgdTools } from '../tools/agd-tools.js';
import { type E2ETools } from '../tools/e2e-tools.js';
import { makeGetFile, makeSetupRegistry } from '../tools/registry.js';
import { generateMnemonic } from '../tools/wallet.js';
import { makeRetryUntilCondition } from '../tools/sleep.js';
import { makeDeployBuilder } from '../tools/deploy.js';

const setupRegistry = makeSetupRegistry(makeGetFile({ dirname, join }));

export const chainConfig = {
  cosmoshub: {
    chainId: 'gaialocal',
    denom: 'uatom',
    expectedAddressPrefix: 'cosmos',
  },
  osmosis: {
    chainId: 'osmosislocal',
    denom: 'uosmo',
    expectedAddressPrefix: 'osmo',
  },
  agoric: {
    chainId: 'agoriclocal',
    denom: 'ubld',
    expectedAddressPrefix: 'agoric',
  },
};

export const chainNames = Object.keys(chainConfig);

const makeKeyring = async (
  e2eTools: Pick<E2ETools, 'addKey' | 'deleteKey'>,
) => {
  let _keys = ['user1'];
  const setupTestKeys = async (keys = ['user1']) => {
    _keys = keys;
    const wallets: Record<string, string> = {};
    for (const name of keys) {
      const res = await e2eTools.addKey(name, generateMnemonic());
      const { address } = JSON.parse(res);
      wallets[name] = address;
    }
    return wallets;
  };

  const deleteTestKeys = (keys: string[] = []) =>
    Promise.allSettled(
      Array.from(new Set([...keys, ..._keys])).map(key =>
        e2eTools.deleteKey(key).catch(),
      ),
    ).catch();

  return { setupTestKeys, deleteTestKeys };
};

export const commonSetup = async (t: ExecutionContext) => {
  const { useChain } = await setupRegistry();
  const tools = await makeAgdTools(t.log, childProcess);
  const keyring = await makeKeyring(tools);
  const deployBuilder = makeDeployBuilder(tools, fse.readJSON, execa);
  const retryUntilCondition = makeRetryUntilCondition(t.log);

  return { useChain, ...tools, ...keyring, retryUntilCondition, deployBuilder };
};

export type SetupContext = Awaited<ReturnType<typeof commonSetup>>;
export type SetupContextWithWallets = Omit<SetupContext, 'setupTestKeys'> & {
  wallets: Record<string, string>;
};
