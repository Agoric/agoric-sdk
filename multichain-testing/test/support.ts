import type { ExecutionContext } from 'ava';
import { dirname, join } from 'path';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import * as ambientChildProcess from 'node:child_process';
import * as ambientFsp from 'node:fs/promises';
import { type E2ETools, makeE2ETools } from '../tools/e2e-tools.js';
import { makeGetFile, makeSetupRegistry } from '../tools/registry.js';
import { generateMnemonic } from '../tools/wallet.js';
import { makeRetryUntilCondition } from '../tools/sleep.js';

const setupRegistry = makeSetupRegistry(makeGetFile({ dirname, join }));

const makeAgdTools = async (t: ExecutionContext) => {
  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  const { writeFile } = ambientFsp;
  const { execFileSync, execFile } = ambientChildProcess;
  const tools = await makeE2ETools(t, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
    writeFile,
  });
  return tools;
};

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

  const deleteTestKeys = () =>
    Promise.all(_keys.map(key => e2eTools.deleteKey(key).catch())).catch();

  return { setupTestKeys, deleteTestKeys };
};

export const commonSetup = async (t: ExecutionContext) => {
  const { useChain } = await setupRegistry();
  const tools = await makeAgdTools(t);
  const keyring = await makeKeyring(tools);
  const retryUntilCondition = makeRetryUntilCondition(t.log);

  return { useChain, ...tools, ...keyring, retryUntilCondition };
};

export type SetupContext = Awaited<ReturnType<typeof commonSetup>>;
export type SetupContextWithWallets = Omit<SetupContext, 'setupTestKeys'> & {
  wallets: Record<string, string>;
};
