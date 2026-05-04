#!/usr/bin/env -S node --import ts-blank-space/register
/** @file tools for smart wallet stores, e.g. ymaxControl */
import '@endo/init';

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import { makeFileRW } from '@agoric/pola-io/src/file.js';
import {
  SigningStargateClient,
  type DeliverTxResponse,
  type StdFee,
} from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { RunTools } from '../src/wallet-admin-types.ts';

const Usage = `tool.ts MODULE ...args`;

// don't contaminate stdout!
const trace = (...args) => console.error('-- wallet-admin:', ...args);

type ClientUtilsConnect = Parameters<
  typeof makeSigningSmartWalletKit
>[0]['connectWithSigner'];

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
    connectWithSigner = SigningStargateClient.connectWithSigner as ClientUtilsConnect,
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
  } as const;

  const makeAccount = async (
    name: string,
    connectOpts: Parameters<ClientUtilsConnect>[2] = {},
  ) => {
    trace('makeAccount', name);
    const mnemonic = env[name] || Fail`${name} not set`;

    const connect: ClientUtilsConnect = (rpcAddr, signer, opts = {}) =>
      connectWithSigner(rpcAddr, signer, { ...opts, ...connectOpts });

    const ssk = await makeSigningSmartWalletKit(
      { connectWithSigner: connect, walletUtils: walletKit },
      mnemonic,
    );
    let lastTx: DeliverTxResponse | undefined;
    /** Retain a short tx history for debugging repeated submissions. */
    const txHistory: DeliverTxResponse[] = [];
    const tracked = harden({
      ...ssk,
      sendBridgeAction: async (
        ...args: Parameters<typeof ssk.sendBridgeAction>
      ) => {
        const tx = await ssk.sendBridgeAction(...args);
        lastTx = tx;
        txHistory.push(tx);
        return tx;
      },
    });
    return harden({
      ...tracked,
      get store() {
        return reflectWalletStore(tracked, storeOpts);
      },
      get lastTx() {
        return lastTx;
      },
      get txHistory() {
        return [...txHistory];
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

  const cwdIO = makeFileRW(cwdPath, {
    fsp,
    path: { ...path, join: path.resolve },
  });
  const tools = {
    E,
    fetch,
    harden,
    scriptArgs,
    setTimeout,
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
