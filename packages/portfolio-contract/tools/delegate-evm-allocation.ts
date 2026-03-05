#!/usr/bin/env -S node --import @endo/init --import ts-blank-space/register
/** @file CLI for ymax-tool-style direct DelegateAllocation submission. */
// XXX: Keep this under tools/ for now; putting it under scripts/ currently
// conflicts with this package's tsconfig/eslint project inclusion.

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { getYmaxStandaloneOperationData } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { SigningStargateClient } from '@cosmjs/stargate';
import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import { parseArgs as parseNodeArgs } from 'node:util';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

const usage = `Usage:
  ./tools/delegate-evm-allocation.ts --portfolio N --address 0xDELEGATE [--chain-id N] [--contract ymax0|ymax1] [--deadline UNIX_SECONDS]

Environment:
  AGORIC_NET                    network selector for @agoric/client-utils
                                (options: devnet, main; default: devnet).
  TRADER_KEY                    EVM owner signer key (signs DelegateAllocation):
                                either mnemonic words or 0x<64-hex> private key.
  EMS_KEY                       Agoric wallet mnemonic that invokes evmWalletHandler.

Options:
  --portfolio <id>      Portfolio ID as integer.
  --address <0x...>     Delegate EVM address to authorize for allocation control.
  --chain-id <n>        EVM chain ID for EIP-712 domain
                         (421614=Arbitrum Sepolia, 11155111=Ethereum Sepolia, 43113=Avalanche Fuji);
                         default: 421614 on devnet, 1 on main.
  --contract <v>        ymax0 or ymax1 (default: ymax0).
  --deadline <unix>     Optional UNIX-seconds deadline (default: now + 3600).
  -h, --help            Show this help.
`;

const parseCli = (argv: string[]) => {
  const { values, positionals } = parseNodeArgs({
    args: argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      portfolio: { type: 'string' },
      address: { type: 'string' },
      'chain-id': { type: 'string' },
      contract: { type: 'string' },
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

type CliValues = ReturnType<typeof parseCli>;

type Address = `0x${string}`;

const factories = {
  mainnet: {
    ymax0: '0x827A7A0bB3D6F2f624a9774C3d84D33d460De44A',
    ymax1: '0x0F0D45A7b641C565799a68aDB41edEf4D6959E4A',
  },
  testnet: {
    ymax0: '0x45F636F03F8570768A7907C0b21BDf791e69B437',
    ymax1: '0x45F636F03F8570768A7907C0b21BDf791e69B437',
  },
} as const;
const TESTNET_CHAIN_IDS = [421614n, 11155111n, 43113n, 84532n, 11155420n];

const addMinutes = (currentTimeMs: number, minutes: number) =>
  BigInt(Math.floor(currentTimeMs / 1000) + minutes * 60);

const parseInvocationArgs = (args: CliValues) => {
  if (args.help) return;

  const requiredArg = (key: 'portfolio' | 'address'): string => {
    const value = args[key];
    if (!value) throw Error(`${usage}\nmissing --${key}`);
    return value;
  };
  const parseBigint = (raw: string, label: string): bigint => {
    try {
      return BigInt(raw);
    } catch {
      throw Error(`${label} must be an integer: ${raw}`);
    }
  };
  const parseOptionalBigint = (
    raw: string | undefined,
    label: string,
  ): bigint | undefined => (raw ? parseBigint(raw, label) : undefined);
  const parseAddress = (raw: string): Address => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      throw Error(`--address must be a 20-byte hex address: ${raw}`);
    }
    return raw as Address;
  };
  const parseContract = (raw: string | undefined): 'ymax0' | 'ymax1' => {
    const contract = raw ?? 'ymax0';
    if (contract === 'ymax0' || contract === 'ymax1') return contract;
    throw Error('--contract must be ymax0 or ymax1');
  };

  const portfolio = parseBigint(requiredArg('portfolio'), '--portfolio');
  const delegateAddress = parseAddress(requiredArg('address'));
  const chainId = parseOptionalBigint(args['chain-id'], '--chain-id');
  const contract = parseContract(args.contract);
  const deadline = parseOptionalBigint(args.deadline, '--deadline');
  return { portfolio, delegateAddress, chainId, contract, deadline };
};

const bytesToBigint = (bytes: Uint8Array): bigint => {
  let value = 0n;
  for (const b of bytes) value = (value << 8n) + BigInt(b);
  return value;
};

const required = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name];
  if (!value) throw Error(`${usage}\n${name} not set`);
  return value;
};

const makeEVMAccount = (key: string, name: string) => {
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

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    now = Date.now,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    randomBytes = cryptoRandomBytes,
  } = {},
) => {
  const cli = parseCli(argv);
  const parsed = !cli.help && parseInvocationArgs(cli);
  if (!parsed) {
    console.error(usage);
    return;
  }

  const { portfolio, delegateAddress, contract } = parsed;
  const agoricNet = env.AGORIC_NET ?? 'devnet';
  const { chainId = agoricNet === 'main' ? 1n : 421614n } = parsed;
  const { deadline = addMinutes(now(), 60) } = parsed;
  const network = TESTNET_CHAIN_IDS.includes(chainId) ? 'testnet' : 'mainnet';
  const verifyingContract = factories[network][contract];
  const nonce = bytesToBigint(randomBytes(8));
  const delegationIntent = getYmaxStandaloneOperationData(
    { portfolio, address: delegateAddress, nonce, deadline },
    'DelegateAllocation',
    chainId,
    verifyingContract,
  );
  const trader = makeEVMAccount(required(env, 'TRADER_KEY'), 'TRADER_KEY');
  const signature = await trader.signTypedData(delegationIntent);

  // #region Copied from multichain-testing/scripts/ymax-tool.ts
  // This smart-wallet setup is shared with ymax-tool and should be factored.
  const ems = await (async () => {
    const devenv = { ...env, AGORIC_NET: agoricNet };
    const networkConfig = await fetchEnvNetworkConfig({ env: devenv, fetch });
    const delay = (ms: number): Promise<void> =>
      new Promise(resolve => setTimeout(resolve, ms));
    const walletKit = await makeSmartWalletKit({ fetch, delay }, networkConfig);
    return makeSigningSmartWalletKit(
      { connectWithSigner, walletUtils: walletKit },
      required(env, 'EMS_KEY'),
    );
  })();
  // #endregion

  // #region Copied from multichain-testing/scripts/ymax-tool.ts
  // This invokeEntry payload shape is shared with ymax-tool and should be factored.
  const id = `delegate-allocation-${new Date(now()).toISOString()}`;
  const tx = await ems.sendBridgeAction(
    harden({
      method: 'invokeEntry',
      message: {
        id,
        targetName: 'evmWalletHandler',
        method: 'handleMessage',
        args: [{ ...delegationIntent, signature }],
      },
    }),
  );
  // #endregion

  if (tx.code !== 0) {
    throw Error(`DelegateAllocation tx failed (${tx.code}): ${tx.rawLog}`);
  }

  console.log(
    JSON.stringify(
      {
        id,
        status: 'submitted',
        txHash: tx.transactionHash,
        height: tx.height,
        owner: trader.address,
        delegate: delegateAddress,
        portfolio,
        chainId,
        contract,
        verifyingContract,
      },
      (_, v) => (typeof v === 'bigint' ? `${v}` : v),
      2,
    ),
  );
};

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
