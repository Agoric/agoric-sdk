import type { ExecutionContext } from 'ava';
import { dirname, join } from 'path';
import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';
import { makeAgdTools } from '../tools/agd-tools.js';
import { type E2ETools } from '../tools/e2e-tools.js';
import { makeGetFile, makeSetupRegistry } from '../tools/registry.js';
import { generateMnemonic } from '../tools/wallet.js';
import {
  makeRetryUntilCondition,
  sleep,
  stirUntilSettled,
} from '../tools/sleep.js';
import { makeDeployBuilder } from '../tools/deploy.js';
import { makeHermes } from '../tools/hermes-tools.js';
import type { ExecAsync, ExecSync } from '../tools/agd-lib.js';

export const FAUCET_POUR = 10_000n * 1_000_000n;

const setupRegistry = makeSetupRegistry(makeGetFile({ dirname, join }));

// XXX consider including bech32Prefix in `ChainInfo`
export const chainConfig: Record<string, { expectedAddressPrefix: string }> = {
  cosmoshub: {
    expectedAddressPrefix: 'cosmos',
  },
  osmosis: {
    expectedAddressPrefix: 'osmo',
  },
  agoric: {
    expectedAddressPrefix: 'agoric',
  },
} as const;

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

const ambientSetTimeout = globalThis.setTimeout;
const ambientFetch = globalThis.fetch;

export const makeStirringOptions = (
  t: ExecutionContext,
  stir: (description: string) => void,
  setTimeout = ambientSetTimeout,
) => ({
  log: t.log,
  stir,
  setTimeout,
});

const makeStirringPowers = (
  t: ExecutionContext,
  {
    fetch = ambientFetch,
    execFile = childProcess.execFile,
    setTimeout = ambientSetTimeout,
  } = {},
) => {
  const stirWith = (stir: (description: string) => void) =>
    makeStirringOptions(t, stir, setTimeout);
  const delay = (ms: number) =>
    sleep(
      ms,
      stirWith(description => t.pass(`stirring in commonSetup ${description}`)),
    );

  const stirringFetch: typeof fetch = async (
    ...args: Parameters<typeof fetch>
  ) => {
    const resultP = ambientFetch(...args);
    return stirUntilSettled(
      resultP,
      stirWith(description => t.pass(`stirring during fetch ${description}`)),
    );
  };

  const execFileAsync: ExecAsync = (file, args, opts) => {
    const stdoutP = new Promise<string>((resolve, reject) => {
      execFile(
        file,
        args,
        { ...opts, encoding: 'utf-8' },
        (error, stdout, _stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        },
      );
    });
    return stirUntilSettled(
      stdoutP,
      stirWith(description =>
        t.pass(`stirring in execFileAsync ${description}`),
      ),
    );
  };
  const stirWhile = <T>(
    result: T,
    stir: (description: string) => void = desc =>
      t.pass(`stirring while ${desc}`),
  ) => stirUntilSettled(result, stirWith(stir));
  return { delay, fetch: stirringFetch, execFileAsync, stirWhile };
};

export const commonSetup = async (t: ExecutionContext) => {
  const { useChain } = await setupRegistry();
  const stirringPowers = makeStirringPowers(t);
  const tools = await makeAgdTools(t.log, {
    execFileSync: childProcess.execFileSync as ExecSync,
    ...stirringPowers,
  });
  const keyring = await makeKeyring(tools);
  const deployBuilder = makeDeployBuilder(
    tools,
    fse.readJSON,
    execa,
    stirringPowers.stirWhile,
  );
  const retryUntilCondition = makeRetryUntilCondition(
    makeStirringOptions(t, description =>
      t.pass(`stirring in retryUntilCondition ${description}`),
    ),
  );
  const hermes = makeHermes({
    execFileSync: childProcess.execFileSync as ExecSync,
  });

  /**
   * Starts a contract if instance not found. Takes care of installing
   * bundles and voting on the CoreEval proposal.
   *
   * @param contractName name of the contract in agoricNames
   * @param contractBuilder path to proposal builder
   */
  const startContract = async (
    contractName: string,
    contractBuilder: string,
  ) => {
    const { vstorageClient } = tools;
    const instances = Object.fromEntries(
      await vstorageClient.queryData(`published.agoricNames.instance`),
    );
    if (contractName in instances) {
      return t.log('Contract found. Skipping installation...');
    }
    t.log('bundle and install contract', contractName);
    await deployBuilder(contractBuilder);
    await retryUntilCondition(
      () => vstorageClient.queryData(`published.agoricNames.instance`),
      res => contractName in Object.fromEntries(res),
      `${contractName} instance is available`,
    );
  };

  return {
    useChain,
    ...tools,
    ...keyring,
    retryUntilCondition,
    deployBuilder,
    hermes,
    startContract,
  };
};

export type SetupContext = Awaited<ReturnType<typeof commonSetup>>;
export type SetupContextWithWallets = Omit<SetupContext, 'setupTestKeys'> & {
  wallets: Record<string, string>;
};
