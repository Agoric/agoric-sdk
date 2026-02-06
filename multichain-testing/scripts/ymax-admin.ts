#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for smart wallet stores, e.g. ymaxControl
 */
import '@endo/init';

import type { RunTools } from '@aglocal/portfolio-deploy/src/wallet-admin-types.ts';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import { makeTracer } from '@agoric/internal';
import { makeFileRW } from '@agoric/pola-io/src/file.js';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const Usage = `tool.ts MODULE ...args`;

const trace = makeTracer('ymax-admin');

const makeFee = ({
  gas = 20_000, // cosmjs default
  adjustment = 1.0,
  price = 0.03,
  denom = 'ubld',
} = {}): StdFee => ({
  gas: `${Math.round(gas * adjustment)}`,
  amount: [{ denom, amount: `${Math.round(gas * adjustment * price)}` }],
});

export const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    now = Date.now,
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
  const cwdPath = `${cwd()}/`;
  const nodeRequire = createRequire(cwdPath);
  const modPath = nodeRequire.resolve(specifier);
  const mod = await import(modPath);
  const fn: (tools: Partial<RunTools>) => Promise<void> = mod.default;
  if (!fn) {
    throw Error(`no default export from ${specifier}`);
  }

  const cwdIO = makeFileRW(cwdPath, { fsp, path });
  const tools = {
    E,
    harden,
    scriptArgs,
    walletKit,
    makeAccount,
    cwd: cwdIO,
  };
  await fn(tools);
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  console.error(err);
  process.exit(1);
});
