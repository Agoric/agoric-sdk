#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init';

import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { makeFileRW } from '@agoric/pola-io/src/file.js';
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { stringToPath } from '@cosmjs/crypto';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import {
  SigningStargateClient,
  StargateClient,
  defaultRegistryTypes,
  type SignerData,
  type StdFee,
} from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { createHash } from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  makeGrantEncodeObject,
  makeUpgradeExecEncodeObject,
} from '../src/ymax-authz-helpers.ts';

const usage = `Usage:
  ymax-authz.ts grant --grantee <address> [--hours 4] [--outfile <file>]
  ymax-authz.ts sign-upgrade --bundle <bundleId> [--overrides <file>] [--invocation-id <id>] [--outfile <file>]
  ymax-authz.ts broadcast --tx-file <file> [--outfile <file>]`;

const devnetContract = 'ymax0';
const devnetControlAddress = CONTROL_ADDRESSES[devnetContract].devnet;

const defaultFee: StdFee = {
  gas: '400000',
  amount: [{ denom: 'ubld', amount: '10000' }],
};

const registry = new Registry([
  ...defaultRegistryTypes,
  [MsgWalletSpendAction.typeUrl, MsgWalletSpendAction as GeneratedType],
  [MsgGrant.typeUrl, MsgGrant as GeneratedType],
  [MsgExec.typeUrl, MsgExec as GeneratedType],
]);

type Command =
  | {
      kind: 'grant';
      grantee: string;
      hours: number;
      memo: string;
      outfile?: FileRW;
    }
  | {
      kind: 'sign-upgrade';
      bundleId: string;
      invocationId: string;
      memo: string;
      overrides?: FileRd;
      outfile?: FileRW;
    }
  | {
      kind: 'broadcast';
      txFile: FileRd;
      outfile?: FileRW;
    };

type SignedUpgradeArtifact = {
  kind: 'ymax-devnet-authz-upgrade';
  contract: typeof devnetContract;
  controlAddress: string;
  grantee: string;
  bundleId: string;
  invocationId: string;
  chainId: string;
  txBytesBase64: string;
  txBytesSha256: string;
  signerData: SignerData;
  createdAt: string;
  memo: string;
  overridesPath?: string;
};

type BroadcastArtifact = SignedUpgradeArtifact & {
  txHash: string;
  height: number;
};

type FileRW = ReturnType<typeof makeFileRW>;
type FileRd = ReturnType<FileRW['readOnly']>;

type Io = {
  connectRpc: typeof StargateClient.connect;
  connectWithSigner: typeof SigningStargateClient.connectWithSigner;
  cwdIO: FileRW;
  fetch: typeof globalThis.fetch;
  setTimeout: typeof globalThis.setTimeout;
  stdout: Pick<NodeJS.WriteStream, 'write'>;
};

const parseCli = (argv: string[], cwdIO: FileRW): Command => {
  const cwdRd = cwdIO.readOnly();
  const [subcommand, ...rest] = argv.slice(2);
  if (!subcommand) throw Error(usage);
  const { values } = parseArgs({
    args: rest,
    options: {
      bundle: { type: 'string' },
      grantee: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      hours: { type: 'string', default: '4' },
      'invocation-id': { type: 'string' },
      memo: { type: 'string', default: '' },
      outfile: { type: 'string' },
      overrides: { type: 'string' },
      'tx-file': { type: 'string' },
    },
  });
  if (values.help) throw Error(usage);
  switch (subcommand) {
    case 'grant':
      return {
        kind: 'grant',
        grantee: requireString(values.grantee, 'grantee'),
        hours: Number.parseInt(requireString(values.hours, 'hours'), 10),
        memo: typeof values.memo === 'string' ? values.memo : '',
        outfile:
          typeof values.outfile === 'string'
            ? cwdIO.join(values.outfile)
            : undefined,
      };
    case 'sign-upgrade': {
      return {
        kind: 'sign-upgrade',
        bundleId: requireString(values.bundle, 'bundle'),
        invocationId:
          typeof values['invocation-id'] === 'string'
            ? values['invocation-id']
            : `devnet-${devnetContract}-${new Date().toISOString()}`,
        memo: typeof values.memo === 'string' ? values.memo : '',
        overrides:
          typeof values.overrides === 'string'
            ? cwdRd.join(values.overrides)
            : undefined,
        outfile:
          typeof values.outfile === 'string'
            ? cwdIO.join(values.outfile)
            : undefined,
      };
    }
    case 'broadcast':
      return {
        kind: 'broadcast',
        txFile: cwdRd.join(requireString(values['tx-file'], 'tx-file')),
        outfile:
          typeof values.outfile === 'string'
            ? cwdIO.join(values.outfile)
            : undefined,
      };
    default:
      throw Error(`${usage}\nunknown subcommand: ${subcommand}`);
  }
};

const requireString = (
  specimen: string | boolean | undefined,
  name: string,
): string => {
  if (typeof specimen !== 'string' || !specimen) {
    throw Error(`missing --${name}`);
  }
  return specimen;
};

const writeJson = async (
  outfile: FileRW | undefined,
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  specimen: unknown,
) => {
  const text = `${JSON.stringify(specimen, null, 2)}\n`;
  if (!outfile) {
    stdout.write(text);
    return;
  }
  await outfile.writeText(text);
};

const getDevnetConfig = async ({
  env,
  fetch,
}: {
  env: typeof process.env;
  fetch: typeof globalThis.fetch;
}) => {
  const networkConfig = await fetchEnvNetworkConfig({ env, fetch }); // BZZT! Ambient fetch
  if (networkConfig.chainName === 'agoric-3') {
    throw Error('ymax-authz.ts is devnet-only');
  }
  return networkConfig;
};

const makeSigningClientKit = async (
  mnemonic: string,
  rpcAddr: string,
  connectWithSigner = SigningStargateClient.connectWithSigner, // BZZT! Ambient
) => {
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });
  const accounts = await signer.getAccounts();
  accounts.length === 1 || Fail`expected exactly one account`;
  const [{ address }] = accounts;
  const client = await connectWithSigner(rpcAddr, signer, { registry });
  return { address, client };
};

const makeGrant = async (
  cmd: Extract<Command, { kind: 'grant' }>,
  env: typeof process.env,
  { connectWithSigner, fetch, stdout }: Io,
) => {
  const networkConfig = await getDevnetConfig({ env, fetch });
  const mnemonic = env.GRANTER_MNEMONIC || env.MNEMONIC;
  if (!mnemonic) throw Error('GRANTER_MNEMONIC or MNEMONIC must be set');
  const rpcAddr = networkConfig.rpcAddrs[0] || Fail`missing rpcAddr`;
  const { address, client } = await makeSigningClientKit(
    mnemonic,
    rpcAddr,
    connectWithSigner,
  );
  const expiresAt = new Date(Date.now() + cmd.hours * 60 * 60 * 1000);
  const grantMsg = makeGrantEncodeObject({
    granter: address,
    grantee: cmd.grantee,
    expiresAt,
  });
  const tx = await client.signAndBroadcast(
    address,
    [grantMsg],
    defaultFee,
    cmd.memo,
  );
  const result = {
    kind: 'ymax-devnet-authz-grant',
    granter: address,
    grantee: cmd.grantee,
    expiresAt: expiresAt.toISOString(),
    txHash: tx.transactionHash,
    height: tx.height,
  };
  await writeJson(cmd.outfile, stdout, result);
};

const makeSignUpgrade = async (
  cmd: Extract<Command, { kind: 'sign-upgrade' }>,
  env: typeof process.env,
  { connectWithSigner, fetch, setTimeout, stdout }: Io,
) => {
  const networkConfig = await getDevnetConfig({ env, fetch });
  const mnemonic = env.GRANTEE_MNEMONIC || env.MNEMONIC;
  if (!mnemonic) throw Error('GRANTEE_MNEMONIC or MNEMONIC must be set');
  const rpcAddr = networkConfig.rpcAddrs[0] || Fail`missing rpcAddr`;
  const { address, client } = await makeSigningClientKit(
    mnemonic,
    rpcAddr,
    connectWithSigner,
  );
  const walletKit = await makeSmartWalletKit(
    {
      fetch,
      delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
    },
    networkConfig,
  );
  const { postalService } = walletKit.agoricNames.instance;
  postalService || assert.fail('missing postalService instance in agoricNames');

  const overrides = cmd.overrides
    ? (JSON.parse(await cmd.overrides.readText()) as object) || {}
    : {};
  const privateArgsOverrides = harden({
    ...overrides,
    postalServiceInstance: postalService,
  });
  const execMsg = makeUpgradeExecEncodeObject({
    marshaller: walletKit.marshaller,
    controlAddress: devnetControlAddress,
    grantee: address,
    bundleId: cmd.bundleId,
    invocationId: cmd.invocationId,
    privateArgsOverrides,
  });
  const sequence = await client.getSequence(address);
  const signerData: SignerData = {
    accountNumber: sequence.accountNumber,
    sequence: sequence.sequence,
    chainId: networkConfig.chainName,
  };
  const signedTx = await client.sign(
    address,
    [execMsg],
    defaultFee,
    cmd.memo,
    signerData,
  );
  const txBytes = TxRaw.encode(signedTx).finish();
  const result: SignedUpgradeArtifact = {
    kind: 'ymax-devnet-authz-upgrade',
    contract: devnetContract,
    controlAddress: devnetControlAddress,
    grantee: address,
    bundleId: cmd.bundleId,
    invocationId: cmd.invocationId,
    chainId: networkConfig.chainName,
    txBytesBase64: Buffer.from(txBytes).toString('base64'),
    txBytesSha256: createHash('sha256').update(txBytes).digest('hex'),
    signerData,
    createdAt: new Date().toISOString(),
    memo: cmd.memo,
    overridesPath: cmd.overrides?.toString(),
  };
  await writeJson(cmd.outfile, stdout, result);
};

const makeBroadcast = async (
  cmd: Extract<Command, { kind: 'broadcast' }>,
  env: typeof process.env,
  { connectRpc, fetch, stdout }: Io,
) => {
  const networkConfig = await getDevnetConfig({ env, fetch });
  const specimen = JSON.parse(
    await cmd.txFile.readText(),
  ) as SignedUpgradeArtifact;
  if (specimen.kind !== 'ymax-devnet-authz-upgrade') {
    throw Error(`unexpected tx file kind: ${String((specimen as any).kind)}`);
  }
  const rpcAddr = networkConfig.rpcAddrs[0] || Fail`missing rpcAddr`;
  const client = await connectRpc(rpcAddr);
  const txBytes = Buffer.from(specimen.txBytesBase64, 'base64');
  const tx = await client.broadcastTx(txBytes);
  const result: BroadcastArtifact = {
    ...specimen,
    txHash: tx.transactionHash,
    height: tx.height,
  };
  await writeJson(cmd.outfile, stdout, result);
};

export const main = async (
  argv = process.argv,
  env = process.env,
  {
    connectRpc = StargateClient.connect,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    cwdIO = makeFileRW('.', {
      fsp,
      path: { ...path, join: path.resolve },
    }),
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    stdout = process.stdout,
  }: Partial<Io> = {},
) => {
  const command = parseCli(argv, cwdIO);
  const io: Io = {
    connectRpc,
    connectWithSigner,
    cwdIO,
    fetch,
    setTimeout,
    stdout,
  };
  switch (command.kind) {
    case 'grant':
      await makeGrant(command, env, io);
      return;
    case 'sign-upgrade':
      await makeSignUpgrade(command, env, io);
      return;
    case 'broadcast':
      await makeBroadcast(command, env, io);
      return;
    default:
      throw Error(`unsupported command`);
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
