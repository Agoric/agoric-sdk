#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for smart wallet stores @@@@@TODO
 */
import '@endo/init';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
  type SigningSmartWalletKit,
} from '@agoric/client-utils';
import { makeTracer } from '@agoric/internal';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { createRequire } from 'node:module';
import { E } from '@endo/far';

const Usage = `tool.ts MODULE ...args`;
// import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
// import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
// type YMaxStartFn = typeof YMaxStart;

const trace = makeTracer('ag-run2');

const makeFee = ({
  gas = 20_000, // cosmjs default
  adjustment = 1.0,
  price = 0.03,
  denom = 'ubld',
} = {}): StdFee => ({
  gas: `${Math.round(gas * adjustment)}`,
  amount: [{ denom, amount: `${Math.round(gas * adjustment * price)}` }],
});

export type SigningSmartWalletKitWithStore = SigningSmartWalletKit & {
  store: ReturnType<typeof reflectWalletStore>;
};

export interface RunTools {
  scriptArgs: string[];
  makeAccount(name: string): SigningSmartWalletKitWithStore;
  E: typeof E;
  harden: typeof harden;
}

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    now = Date.now,
    // stdin = process.stdin,
    // stdout = process.stdout,
    cwd = process.cwd,
  } = {},
) => {
  const fresh = () => new Date(now()).toISOString();
  const delay = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});

  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const walletKit = await makeSmartWalletKit({ fetch, delay }, networkConfig);

  const storeOpts = {
    setTimeout,
    log: trace,
    makeNonce: fresh,
    // use generous gas limit for portfolio-contract,
    // and a gas price as observed on the RPC node we use on this network.
    fee: makeFee({ gas: 2_500_000 }),
  };

  const makeAccount = async (name: string) => {
    trace('makeAccount', name);
    const mnemonic = env[name] || Fail`${name} not set`;
    const ssk = await makeSigningSmartWalletKit(
      { connectWithSigner, walletUtils: walletKit },
      mnemonic,
    );
    return harden({
      ...ssk,
      get store() {
        return reflectWalletStore(ssk, storeOpts);
      },
    });
  };

  const [_node, _script, specifier, ...scriptArgs] = argv;
  if (!specifier) throw Usage;
  const tools = {
    E,
    harden,
    scriptArgs,
    walletKit,
    makeAccount,
  };

  const nodeRequire = createRequire(`${cwd()}/`);
  const modPath = nodeRequire.resolve(specifier);
  const mod = await import(modPath);
  const fn = mod.default;
  if (!fn) {
    throw Error(`no default export from ${specifier}`);
  }
  await fn(tools);
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  console.error(err);
  process.exit(1);
});
