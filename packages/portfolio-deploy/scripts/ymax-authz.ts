#!/usr/bin/env -S node --import ts-blank-space/register
// use @endo/init/debug so LOCKDOWN_OPTIONS are consistent with tests
import '@endo/init/debug.js';

/**
 * agd tx sign /tmp/redo/unsigned-tx.json \
  --offline \
  --sign-mode direct \
  --from gov4 \
  --account-number 122 \
  --sequence 1 \
  --chain-id devnet \
  --overwrite \
  --output-document /tmp/redo/signed-tx.json
 *
 * TODO: emit an unsigned tx shape that does not require `--overwrite`.
 * The current cosmos-sdk sign path panics when signer_infos is populated but
 * signatures is still empty.
 */

import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { makeFileRW } from '@agoric/pola-io/src/file.js';
import { stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkContract, netOfConfig } from '../src/ymax-admin-helpers.ts';
import {
  defaultContract,
  formatJson,
  makeAgdUnsignedTx,
  makeBroadcastArtifactFromFiles,
  makeGrantor,
  makeTxBroadcaster,
  makeUpgradeSigner,
  parseCommand,
  readOverrides,
  registry,
  type FileRW,
} from '../src/ymax-authz-flow.ts';

const makeSigningClientKit = async (
  mnemonic: string,
  rpcAddr: string,
  connectWithSigner: typeof SigningStargateClient.connectWithSigner,
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

const writeOutput = async (
  outfile: FileRW | undefined,
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  specimen: unknown,
) => {
  const text = formatJson(specimen);
  if (outfile) {
    await outfile.writeText(text);
    return;
  }
  stdout.write(text);
};

export const main = async (
  argv = process.argv,
  env = process.env,
  {
    connectRpc = StargateClient.connect,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    files = makeFileRW('.', {
      fsp,
      path: { ...path, join: path.resolve },
    }) as FileRW,
    fetch = globalThis.fetch,
    getNetworkConfig = fetchEnvNetworkConfig,
    makeSignerKit = makeSigningClientKit,
    makeWalletKit = makeSmartWalletKit,
    clock = () => new Date(),
    setTimeout = globalThis.setTimeout,
    stdout = process.stdout,
  } = {},
) => {
  const command = parseCommand(argv, files, env, clock);
  const networkConfig = await getNetworkConfig({ env, fetch });
  const rpcAddr = networkConfig.rpcAddrs[0] || Fail`missing rpcAddr`;

  switch (command.kind) {
    case 'grant': {
      const signerKit = await makeSignerKit(
        command.mnemonic,
        rpcAddr,
        connectWithSigner,
      );
      checkContract(
        defaultContract,
        signerKit.address,
        netOfConfig(networkConfig),
      );
      const grantor = makeGrantor({ signerKit, clock });
      const result = await grantor.grant(command);
      await writeOutput(command.outfile, stdout, result);
      return;
    }
    case 'generate-upgrade': {
      const walletKit = await makeWalletKit(
        {
          fetch,
          delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
        },
        networkConfig,
      );
      const upgradeSigner = makeUpgradeSigner({
        networkConfig,
        grantee: command.grantee,
        queryClient: await connectRpc(rpcAddr),
        walletKit,
        clock,
      });
      const result = await upgradeSigner.signUpgrade({
        bundleId: command.bundleId,
        invocationId: command.invocationId,
        memo: command.memo,
        overrides: await readOverrides(command.overrides),
        overridesPath: command.overrides?.toString(),
      });
      if (command.signingFile) {
        await command.signingFile.writeText(
          formatJson(
            makeAgdUnsignedTx({
              bodyBytes: Buffer.from(result.bodyBytesBase64, 'base64'),
              authInfoBytes: Buffer.from(result.authInfoBytesBase64, 'base64'),
            }),
          ),
        );
      }
      await writeOutput(command.outfile, stdout, result);
      return;
    }
    case 'broadcast': {
      const broadcaster = makeTxBroadcaster({ connectRpc, rpcAddr });
      const result = await makeBroadcastArtifactFromFiles({
        txText: await command.txFile.readText(),
        signatureFile: command.signatureFile,
        broadcaster,
      });
      await writeOutput(command.outfile, stdout, result);
      return;
    }
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
