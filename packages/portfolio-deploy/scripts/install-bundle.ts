#!/usr/bin/env -S node --import ts-blank-space/register
/** @file Install a contract bundle on chain and report the resulting evidence. */
/* global globalThis */
import '@endo/init/debug.js';

import {
  iterateEach,
  makeCastingSpec,
  makeFollower,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import {
  fetchEnvNetworkConfig,
  installBundle,
  makeBundleRegistry,
  makeTendermint34Client,
  validateBundleJson,
} from '@agoric/client-utils';
import { stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import type { StdFee } from '@cosmjs/stargate';
import { SigningStargateClient } from '@cosmjs/stargate';
import * as fsp from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { gzip as gzipCb } from 'node:zlib';

const usage = `Usage: install-bundle.ts --bundle <path>`;

const options = {
  bundle: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false },
} as const;

const gzip = promisify(gzipCb);

const makeFee = ({
  gas = 20_000, // cosmjs default
  adjustment = 1.0,
  price = 0.03, // 0.025 observed on mainnet, plus some headroom
  denom = 'ubld', // price is in this denom
} = {}): StdFee => ({
  gas: `${Math.round(gas * adjustment)}`,
  amount: [{ denom, amount: `${Math.round(gas * adjustment * price)}` }],
});

const watchBundle = async (
  bundleHash: string,
  height: number,
  rpcAddresses: string[],
) => {
  const leader = makeLeaderFromRpcAddresses(rpcAddresses);
  const castingSpec = makeCastingSpec(':bundles');
  const follower = makeFollower(castingSpec, leader);

  for await (const envelope of iterateEach(follower, { height })) {
    const { value } = envelope as {
      value: {
        endoZipBase64Sha512?: string;
        installed?: boolean;
        error?: unknown;
      };
    };
    if (value.endoZipBase64Sha512 !== bundleHash) {
      continue;
    }
    if (!value.installed) {
      throw value.error instanceof Error
        ? value.error
        : Error(
            `bundle ${bundleHash} appeared in :bundles without installed=true`,
          );
    }
    return;
  }

  throw Error(`bundle ${bundleHash} did not appear in :bundles`);
};

export const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    readFile = fsp.readFile,
    fromMnemonic = DirectSecp256k1HdWallet.fromMnemonic,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    makeTmClient = makeTendermint34Client,
  }: {
    fetch?: typeof globalThis.fetch;
    readFile?: typeof fsp.readFile;
    fromMnemonic?: typeof DirectSecp256k1HdWallet.fromMnemonic;
    connectWithSigner?: typeof SigningStargateClient.connectWithSigner;
    makeTmClient?: typeof makeTendermint34Client;
  } = {},
) => {
  const { values } = parseArgs({ args: argv.slice(2), options });
  if (values.help) {
    console.log(usage);
    return;
  }

  const bundlePath = values.bundle;
  if (!bundlePath) {
    throw Error(usage);
  }
  const mnemonic = env.YMAX_INSTALL_BUNDLE_MNEMONIC;
  if (!mnemonic) {
    throw Error('YMAX_INSTALL_BUNDLE_MNEMONIC not set');
  }

  const bundleJson = await readFile(bundlePath, 'utf8');
  const { endoZipBase64Sha512 } = validateBundleJson(bundleJson);

  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const rpcAddr = networkConfig.rpcAddrs[0];
  if (!rpcAddr) {
    throw Error('missing rpcAddr in network config');
  }

  const wallet = await fromMnemonic(mnemonic, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });
  const [account] = await wallet.getAccounts();
  if (!account) {
    throw Error('expected one account from install-bundle mnemonic');
  }
  const { address } = account;
  console.error({ address });
  const client = await connectWithSigner(rpcAddr, wallet, {
    registry: makeBundleRegistry(),
  });
  const tmClient = await makeTmClient(rpcAddr, { fetch });

  let txHash: string | undefined;
  const result = await installBundle({
    bundleJson,
    chunkSizeLimit: Number.MAX_SAFE_INTEGER,
    submitter: address,
    gzip,
    signAndBroadcast: async msg => {
      const gas = await client.simulate(address, [msg], undefined);
      const fee = makeFee({ gas, adjustment: 1.3 });
      console.error(JSON.stringify({ gas, fee }));
      const tx = await client.signAndBroadcast(address, [msg], fee);
      txHash = tx.transactionHash;
      return tx;
    },
    watchBundle: (bundleHash, height) =>
      watchBundle(bundleHash, height, networkConfig.rpcAddrs),
  });
  if (!txHash) {
    throw Error('missing tx hash from install-bundle submission');
  }
  const block = await tmClient.block(result.blockHeight);
  const blockTime = block.block.header.time.toISOString();

  console.log(
    JSON.stringify(
      {
        address,
        bundleId: `b1-${endoZipBase64Sha512}`,
        txHash,
        blockHeight: result.blockHeight,
        blockTime,
        bundleHash: result.bundleHash,
        compressedSize: result.compressedSize,
        uncompressedSize: result.uncompressedSize,
      },
      null,
      2,
    ),
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
