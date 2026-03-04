#!/usr/bin/env -S node --import @endo/init --import ts-blank-space/register
/** @file CLI for submitting EVM standalone SetTargetAllocation to YDS/EMS. */
// XXX: Keep this under tools/ for now; putting it under scripts/ currently
// conflicts with this package's tsconfig/eslint project inclusion.
import {
  getYmaxStandaloneOperationData,
  type TargetAllocation,
  type YmaxStandaloneOperationData,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs as parseNodeArgs } from 'node:util';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type SetupConfig = {
  yds: string;
  chainId: bigint;
  portfolio: bigint;
  ymaxVersion: 'ymax0' | 'ymax1';
  privateKey: `0x${string}`;
};

type EvmOperationSubmitResponse = {
  id: number;
  owner: string;
  status: 'transacted' | 'failed';
  txHash: string | null;
  error: string | null;
  timestamp: string;
};

const ESCAPE_CHARS = /^[!"#$%&'()*+,-]/;
const CONFIG_FILE_BASENAME = 'ymax-openclaw-agent.json';

const YMAX0_FACTORY_MAINNET =
  '0x827A7A0bB3D6F2f624a9774C3d84D33d460De44A' as const;
const YMAX1_FACTORY_MAINNET =
  '0x0F0D45A7b641C565799a68aDB41edEf4D6959E4A' as const;
const FACTORY_TESTNET = '0x45F636F03F8570768A7907C0b21BDf791e69B437' as const;
const TESTNET_CHAIN_IDS = new Set<bigint>([11155111n, 421614n]);

const usage = `Usage:
  To configure:
    ./tools/submit-evm-allocation.ts --setup --yds URL --chain-id N --portfolio N [--ymax-version ymax0|ymax1] [--force]
  for example: devnet
    ./tools/submit-evm-allocation.ts --setup --yds https://dev0.ymax.app --chain-id 421614 --portfolio 7 --ymax-version ymax0
  To submit allocations:
    ./tools/submit-evm-allocation.ts (--allocations-file ./allocations.json | --allocations '[{"instrument":"USDC","portion":"100"}]') [--deadline UNIX_SECONDS]

Options:
  --setup                 Run setup mode.
  --force                 Overwrite existing config in setup mode.
  --yds <url>             YDS base URL (https://main0.ymax.app | https://main1.ymax.app | https://dev0.ymax.app).
  --chain-id <n>          from https://chainlist.org ; 421614=Arbitrum Sepolia, 11155111=Sepolia, 1=Ethereum Mainnet, etc.
  --portfolio <id>        Portfolio ID as integer (required in setup mode).
  --ymax-version <v>      ymax0 or ymax1 (setup mode, default: ymax0).
  --allocations-file <p>  JSON file containing target allocations (submit mode).
  --allocations <json>    Inline JSON array of target allocations (submit mode).
  --deadline <unix>       Optional UNIX-seconds deadline (submit mode).

Query hints:
  API docs: https://dev0.ymax.app/docs
  Current portfolio allocation: https://dev0.ymax.app/portfolios/portfolioNNN
`;

const parseCli = (argv: string[]) => {
  const { values, positionals } = parseNodeArgs({
    args: argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      setup: { type: 'boolean' },
      force: { type: 'boolean' },
      yds: { type: 'string' },
      'chain-id': { type: 'string' },
      portfolio: { type: 'string' },
      'ymax-version': { type: 'string' },
      deadline: { type: 'string' },
      allocations: { type: 'string' },
      'allocations-file': { type: 'string' },
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

const requiredArg = (
  args: CliValues,
  key: 'yds' | 'chain-id' | 'portfolio',
): string => {
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
  args: CliValues,
  key: keyof Pick<CliValues, 'deadline'>,
): bigint | undefined => {
  const raw = args[key];
  return raw ? parseBigint(raw, `--${key}`) : undefined;
};

const parseYmaxVersion = (raw: string | undefined): 'ymax0' | 'ymax1' => {
  const version = raw ?? 'ymax0';
  if (version === 'ymax0' || version === 'ymax1') return version;
  throw Error('--ymax-version must be ymax0 or ymax1');
};

const resolveVerifyingContract = ({
  chainId,
  ymaxVersion,
}: {
  chainId: bigint;
  ymaxVersion: 'ymax0' | 'ymax1';
}) => {
  if (TESTNET_CHAIN_IDS.has(chainId)) return FACTORY_TESTNET;
  return ymaxVersion === 'ymax1'
    ? YMAX1_FACTORY_MAINNET
    : YMAX0_FACTORY_MAINNET;
};

const parseAllocationsFromText = (
  text: string,
  sourceLabel: string,
): TargetAllocation[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error(`${sourceLabel} must contain valid JSON`);
  }
  if (!Array.isArray(parsed))
    throw Error(`${sourceLabel} JSON must be an array`);

  return harden(
    parsed.map((entry, i) => {
      if (!entry || typeof entry !== 'object') {
        throw Error(`allocation[${i}] must be an object`);
      }
      const { instrument, portion } = entry as {
        instrument?: unknown;
        portion?: unknown;
      };
      if (typeof instrument !== 'string') {
        throw Error(`allocation[${i}].instrument must be a string`);
      }
      if (typeof portion !== 'string' && typeof portion !== 'number') {
        throw Error(`allocation[${i}].portion must be number|string`);
      }
      return { instrument, portion: BigInt(portion) };
    }),
  );
};

const loadAllocations = async (
  args: CliValues,
): Promise<TargetAllocation[]> => {
  const inline = args.allocations;
  const file = args['allocations-file'];

  if ((inline ? 1 : 0) + (file ? 1 : 0) !== 1) {
    throw Error(
      `${usage}\nprovide exactly one of --allocations-file or --allocations`,
    );
  }

  if (inline) {
    return parseAllocationsFromText(inline, '--allocations');
  }

  const text = await readFile(file!, 'utf8');
  return parseAllocationsFromText(text, '--allocations-file');
};

// XXX should use @endo/marshal
const toSmallcaps = (value: unknown): JsonValue => {
  if (value === undefined) return '#undefined';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '#NaN';
    if (value === Infinity) return '#Infinity';
    if (value === -Infinity) return '#-Infinity';
    if (Object.is(value, -0)) return 0;
    return value;
  }
  if (typeof value === 'bigint') return value >= 0n ? `+${value}` : `${value}`;
  if (typeof value === 'string')
    return ESCAPE_CHARS.test(value) ? `!${value}` : value;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.map(toSmallcaps);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, toSmallcaps(v)]),
    );
  }
  throw Error(`unsupported value for smallcaps: ${String(value)}`);
};

const isEvmOperationSubmitResponse = (
  value: unknown,
): value is EvmOperationSubmitResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'number' &&
    typeof rec.owner === 'string' &&
    (rec.status === 'transacted' || rec.status === 'failed') &&
    (typeof rec.txHash === 'string' || rec.txHash === null) &&
    (typeof rec.error === 'string' || rec.error === null) &&
    typeof rec.timestamp === 'string'
  );
};

const writeSetupConfig = async (
  cfg: SetupConfig,
  configFile: string,
  force: boolean,
) => {
  const dir = dirname(configFile);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const json = JSON.stringify(
    {
      ...cfg,
      chainId: cfg.chainId.toString(),
      portfolio: cfg.portfolio.toString(),
    },
    null,
    2,
  );
  await writeFile(configFile, `${json}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: force ? 'w' : 'wx',
  });
};

const runSetup = async (args: CliValues, configFile: string) => {
  const yds = requiredArg(args, 'yds');
  const chainId = parseBigint(requiredArg(args, 'chain-id'), '--chain-id');
  const portfolio = parseBigint(requiredArg(args, 'portfolio'), '--portfolio');
  const ymaxVersion = parseYmaxVersion(args['ymax-version']);
  const verifyingContract = resolveVerifyingContract({ chainId, ymaxVersion });
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  await writeSetupConfig(
    {
      yds,
      chainId,
      portfolio,
      ymaxVersion,
      privateKey,
    },
    configFile,
    !!args.force,
  );

  console.error('setup complete', {
    configFile,
    address: account.address,
    yds,
    chainId: chainId.toString(),
    portfolio: portfolio.toString(),
    verifyingContract,
  });
  console.log(
    JSON.stringify({
      ok: true,
      mode: 'setup',
      address: account.address,
      configFile,
    }),
  );
};

const loadSetupConfig = async (configFile: string): Promise<SetupConfig> => {
  const text = await readFile(configFile, 'utf8').catch(err => {
    const rec = err as NodeJS.ErrnoException;
    if (rec.code === 'ENOENT') {
      throw Error(
        `${usage}\nmissing agent config at ${configFile}. run setup first.`,
      );
    }
    throw err;
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error(`invalid JSON in ${configFile}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw Error(`invalid config object in ${configFile}`);
  }
  const rec = parsed as Record<string, unknown>;

  const yds = rec.yds;
  const chainIdRaw = rec.chainId;
  const portfolioRaw = rec.portfolio;
  const ymaxVersionRaw = rec.ymaxVersion;
  const privateKey = rec.privateKey;

  if (typeof yds !== 'string' || !yds)
    throw Error(`invalid yds in ${configFile}`);
  if (typeof chainIdRaw !== 'string')
    throw Error(`invalid chainId in ${configFile}`);
  if (typeof portfolioRaw !== 'string')
    throw Error(`invalid portfolio in ${configFile}`);
  if (
    typeof privateKey !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(privateKey)
  ) {
    throw Error(`invalid privateKey in ${configFile}`);
  }

  const ymaxVersion = parseYmaxVersion(
    typeof ymaxVersionRaw === 'string' ? ymaxVersionRaw : undefined,
  );

  return {
    yds,
    chainId: parseBigint(chainIdRaw, 'config.chainId'),
    portfolio: parseBigint(portfolioRaw, 'config.portfolio'),
    ymaxVersion,
    privateKey: privateKey as `0x${string}`,
  };
};

const buildTypedData = ({
  cfg,
  allocations,
  deadline,
}: {
  cfg: SetupConfig;
  allocations: TargetAllocation[];
  deadline?: bigint;
}): YmaxStandaloneOperationData<'SetTargetAllocation'> => {
  const verifyingContract = resolveVerifyingContract({
    chainId: cfg.chainId,
    ymaxVersion: cfg.ymaxVersion,
  });

  const useNonce = BigInt(`0x${randomBytes(16).toString('hex')}`);
  const useDeadline = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600);

  return getYmaxStandaloneOperationData(
    {
      allocations,
      portfolio: cfg.portfolio,
      nonce: useNonce,
      deadline: useDeadline,
    },
    'SetTargetAllocation',
    cfg.chainId,
    verifyingContract,
  );
};

const postSignedOperation = async ({
  ydsBaseUrl,
  signedMessage,
}: {
  ydsBaseUrl: string;
  signedMessage: unknown;
}): Promise<EvmOperationSubmitResponse> => {
  const endpoint = new URL('/evm-operations', ydsBaseUrl);

  const payload = JSON.stringify(toSmallcaps(signedMessage));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
  });

  if (!response.ok) {
    throw Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!isEvmOperationSubmitResponse(result)) {
    throw Error('Unexpected /evm-operations response shape');
  }

  return result;
};

const runSubmit = async (args: CliValues, configFile: string) => {
  const cfg = await loadSetupConfig(configFile);
  const deadline = parseOptionalBigint(args, 'deadline');

  const allocations = await loadAllocations(args);
  const typedData = buildTypedData({
    cfg,
    allocations,
    deadline,
  });

  const account = privateKeyToAccount(cfg.privateKey);
  console.error('typed data ready', {
    operation: typedData.primaryType,
    owner: account.address,
    chainId: typedData.domain.chainId.toString(),
    portfolio: typedData.message.portfolio.toString(),
    verifyingContract: typedData.domain.verifyingContract,
  });

  const signature = await account.signTypedData(typedData);
  const signedMessage = harden({ ...typedData, signature });

  const result = await postSignedOperation({
    ydsBaseUrl: cfg.yds,
    signedMessage,
  });
  console.error('submitted to EMS', { result });

  if (result.status === 'failed') {
    throw Error(`submission failed: ${result.error || 'unknown error'}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      operationId: result.id,
      txHash: result.txHash,
      status: result.status,
    }),
  );
  // XXX how to track the outcome?
};

const main = (argv = process.argv) => {
  const args = parseCli(argv);
  const configFile = join(homedir(), '.config', CONFIG_FILE_BASENAME);

  if (argv.length <= 2) {
    throw Error(usage);
  }

  if (args.setup) {
    return runSetup(args, configFile);
  }

  return runSubmit(args, configFile);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
