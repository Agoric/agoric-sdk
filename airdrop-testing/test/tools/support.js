import { dirname, join } from 'path';
import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'child_process';
import { makeGetFile, makeSetupRegistry } from '../../tools/registry.js';
import { generateMnemonic } from '../../tools/wallet.js';
import { makeRetryUntilCondition } from '../../tools/sleep.js';
import { makeDeployBuilder } from '../../tools/deploy.js';
import { makeAgdTools } from '../../tools/agd-tools.js';

const setupRegistry = makeSetupRegistry(makeGetFile());

const chainConfig = {
  cosmoshub: { expectedAddressPrefix: 'cosmos' },
  osmosis: { expectedAddressPrefix: 'osmo' },
  agoric: { expectedAddressPrefix: 'agoric' },
};

export const makeKeyring = async e2eTools => {
  //   let _keys = ['user1'];
  let _keys = ['user1'];
  //   const setupTestKeys = async (keys = ['user1']) => {
  const setupTestKeys = async (keys = ['alice']) => {
    _keys = keys;
    const wallets = {};
    for (const name of keys) {
      const res = await e2eTools.addKey(name, generateMnemonic());
      const { address } = JSON.parse(res);
      wallets[name] = address;
    }
    return wallets;
  };

  const deleteTestKeys = (keys = []) =>
    Promise.allSettled(
      Array.from(new Set([...keys, ..._keys])).map(key =>
        e2eTools.deleteKey(key).catch(),
      ),
    ).catch();

  return { setupTestKeys, deleteTestKeys };
};

const commonSetup = async t => {
  const { useChain } = await setupRegistry();
  const tools = await makeAgdTools(t.log, childProcess);
  const keyring = await makeKeyring(tools);
  const deployBuilder = makeDeployBuilder(tools, fse.readJSON, execa);
  const retryUntilCondition = makeRetryUntilCondition({
    log: t.log,
    setTimeout: globalThis.setTimeout,
  });

  return { useChain, ...tools, ...keyring, retryUntilCondition, deployBuilder };
};

export { chainConfig, commonSetup };
