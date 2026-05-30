#!/usr/bin/env -S node --import @endo/init --import ts-blank-space/register
/** @file CLI for direct EVM-signed Grant submission on mainnet ymax0. */

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
  type WalletStoreSigner,
} from '@agoric/client-utils';
import { getYmaxStandaloneOperationData } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { SigningStargateClient } from '@cosmjs/stargate';
import { parseArgs as parseNodeArgs } from 'node:util';
import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { EVMWalletMessageHandler } from '@aglocal/portfolio-contract/src/evm-wallet-handler.exo.ts';
import { axelarConfig } from '../src/axelar-configs.js';

const usage = `Usage:
  ./packages/portfolio-deploy/scripts/grant-portfolio-delegation.ts --portfolio N --account-holder agoric1...
    [--deadline UNIX_SECONDS]

Environment:
  AGORIC_NET                    network selector for @agoric/client-utils
                                must be main.
  TRADER_KEY                    EVM owner signer key for the Grant typed data:
                                either mnemonic words or 0x<64-hex> private key.
  EMS_KEY                       Agoric wallet mnemonic that invokes evmWalletHandler.

Options:
  --portfolio <id>              Portfolio ID as integer.
  --account-holder <agoric1...> Agoric address that will receive the delegation invitation.
  --deadline <unix>             Optional UNIX-seconds deadline (default: now + 3600).
  -h, --help                    Show this help.
`;

type Address = `0x${string}`;
type MinimalNetworkConfig = Awaited<ReturnType<typeof fetchEnvNetworkConfig>>;
type SmartWalletKitLike = Awaited<ReturnType<typeof makeSmartWalletKit>>;
type MainDeps = {
  fetch?: typeof globalThis.fetch;
  setTimeout?: typeof globalThis.setTimeout;
  connectWithSigner?: typeof SigningStargateClient.connectWithSigner;
  randomBytes?: (size: number) => Uint8Array;
  makeNonce?: () => string;
  fetchEnvNetworkConfigImpl?: ({
    env,
    fetch,
  }: {
    env: typeof process.env;
    fetch: typeof globalThis.fetch;
  }) => Promise<MinimalNetworkConfig>;
  makeSmartWalletKitImpl?: (
    powers: {
      fetch: typeof globalThis.fetch;
      delay: (ms: number) => Promise<void>;
    },
    networkConfig: MinimalNetworkConfig,
  ) => Promise<SmartWalletKitLike>;
  makeSigningSmartWalletKitImpl?: (
    args: {
      connectWithSigner: typeof SigningStargateClient.connectWithSigner;
      walletUtils: SmartWalletKitLike;
    },
    mnemonic: string,
  ) => Promise<WalletStoreSigner>;
  reflectWalletStoreImpl?: typeof reflectWalletStore;
};

const parseCli = (argv: string[]) => {
  const { values, positionals } = parseNodeArgs({
    args: argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      portfolio: { type: 'string' },
      'account-holder': { type: 'string' },
      deadline: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (positionals.length > 0) {
    throw Error(
      `${usage}\nunexpected positional args: ${positionals.join(' ')}`,
    );
  }
  return values;
};

const required = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name];
  if (!value) throw Error(`${usage}\n${name} not set`);
  return value;
};

const parseBigint = (raw: string, label: string) => {
  try {
    return BigInt(raw);
  } catch {
    throw Error(`${label} must be an integer: ${raw}`);
  }
};

const bytesToBigint = (bytes: Uint8Array): bigint => {
  let value = 0n;
  for (const b of bytes) value = value * 0x100n + BigInt(b);
  return value;
};

const makeEvmAccount = (key: string, name: string) => {
  if (/^0x[0-9a-fA-F]{64}$/.test(key)) {
    return privateKeyToAccount(key as `0x${string}`);
  }
  try {
    return mnemonicToAccount(key);
  } catch {
    throw Error(
      `${name} must be either mnemonic words or a 0x-prefixed 32-byte private key`,
    );
  }
};

const parseInvocationArgs = (
  values: ReturnType<typeof parseCli>,
  agoricNet: string,
) => {
  if (values.help) return undefined;
  if (agoricNet !== 'main') {
    throw Error(`${usage}\nAGORIC_NET must be main; got ${agoricNet}`);
  }

  const { portfolio: rawPortfolio, 'account-holder': accountHolder } = values;
  if (!rawPortfolio) throw Error(`${usage}\nmissing --portfolio`);
  if (!accountHolder) throw Error(`${usage}\nmissing --account-holder`);
  if (!/^agoric1[0-9a-z]+$/.test(accountHolder)) {
    throw Error(
      `--account-holder must be an Agoric bech32 address: ${accountHolder}`,
    );
  }
  const portfolio = parseBigint(rawPortfolio, '--portfolio');
  const chainId = 1n;
  const deadline = values.deadline
    ? parseBigint(values.deadline, '--deadline')
    : BigInt(Math.floor(Date.now() / 1000) + 3600);
  return {
    portfolio,
    accountHolder,
    chainId,
    deadline,
  };
};

export const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    randomBytes = cryptoRandomBytes,
    makeNonce = () => new Date().toISOString(),
    fetchEnvNetworkConfigImpl = fetchEnvNetworkConfig,
    makeSmartWalletKitImpl = makeSmartWalletKit,
    makeSigningSmartWalletKitImpl = makeSigningSmartWalletKit,
    reflectWalletStoreImpl = reflectWalletStore,
  }: MainDeps = {},
) => {
  const values = parseCli(argv);
  if (values.help) {
    console.error(usage);
    return;
  }

  const agoricNet = env.AGORIC_NET ?? 'devnet';
  const parsed = parseInvocationArgs(values, agoricNet);
  if (!parsed) return;

  const { portfolio, accountHolder, chainId, deadline } = parsed;
  const nonce = bytesToBigint(randomBytes(8));
  const contract = 'ymax0';
  const verifyingContract = axelarConfig.Ethereum.contracts.depositFactory;

  const grantIntent = getYmaxStandaloneOperationData(
    {
      accountHolder,
      permissions: { allocation: true },
      portfolio,
      nonce,
      deadline,
    },
    'Grant',
    chainId,
    verifyingContract as Address,
  );
  const trader = makeEvmAccount(required(env, 'TRADER_KEY'), 'TRADER_KEY');
  const signature = await trader.signTypedData(grantIntent);

  const ems = await (async () => {
    const devenv = { ...env, AGORIC_NET: agoricNet };
    const networkConfig = await fetchEnvNetworkConfigImpl({
      env: devenv,
      fetch,
    });
    const delay = (ms: number): Promise<void> =>
      new Promise(resolve => setTimeout(resolve, ms));
    const walletKit = await makeSmartWalletKitImpl(
      { fetch, delay },
      networkConfig,
    );
    return makeSigningSmartWalletKitImpl(
      { connectWithSigner, walletUtils: walletKit },
      required(env, 'EMS_KEY'),
    );
  })();
  const walletStore = reflectWalletStoreImpl(ems as WalletStoreSigner, {
    setTimeout,
    log: () => {},
    makeNonce,
  });
  const evmWalletHandler =
    walletStore.get<EVMWalletMessageHandler>('evmWalletHandler');

  const signedGrantIntent = harden({
    ...grantIntent,
    signature,
  }) as Parameters<EVMWalletMessageHandler['handleMessage']>[0];
  const { id, tx } = await evmWalletHandler.handleMessage(signedGrantIntent);

  if (tx.code !== 0) {
    throw Error(`Grant tx failed (${tx.code}): ${tx.rawLog}`);
  }

  console.log(
    JSON.stringify(
      {
        id,
        status: 'submitted',
        delegationScope: 'setTargetAllocation',
        txHash: tx.transactionHash,
        height: tx.height,
        owner: trader.address,
        accountHolder,
        permissions: { allocation: true },
        portfolio,
        chainId,
        contract,
        verifyingContract,
      },
      (_, value) => (typeof value === 'bigint' ? `${value}` : value),
      2,
    ),
  );
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  });
}
