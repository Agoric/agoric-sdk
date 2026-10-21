#!/usr/bin/env node
/** @file combine ymax0-main-ctrl signature fragments into a signed tx */
/* global globalThis */
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { fetchEnvNetworkConfig } from '@agoric/client-utils/src/cli.js';
import { $ } from 'execa';

const parseCliArgs = args =>
  parseArgs({
    args,
    allowPositionals: true,
    options: {
      multisig: {
        type: 'string',
        default: 'agoric1w376w9ws44d7l5cp7g5jjqn45mp5teldt5dhg9',
      },
      node: { type: 'string' },
      'output-document': { type: 'string' },
    },
  });

const defaultOutputDocument = unsignedFile => {
  const fileName = unsignedFile.split('/').at(-1);
  if (!fileName) {
    throw Error(`cannot determine output file for: ${unsignedFile}`);
  }
  if (!fileName.endsWith('-unsigned-tx.json')) {
    throw Error(`expected *-unsigned-tx.json, got: ${fileName}`);
  }
  return fileName.replace(/-unsigned-tx\.json$/, '-signed-tx.json');
};

const flags = record =>
  Object.entries(record).flatMap(([key, value]) =>
    value === true ? [`--${key}`] : value ? [`--${key}`, String(value)] : [],
  );

const findKeyRecord = async addressOrName => {
  const { stdout } = await $({
    env: process.env,
    stdio: 'pipe',
    verbose: 'short',
  })`agd keys list --output json`;
  const records = JSON.parse(stdout);
  const key = records.find(
    record => record.address === addressOrName || record.name === addressOrName,
  );
  if (!key) {
    throw Error(`no local key for: ${addressOrName}`);
  }
  return key;
};

// TODO: produce the release artifact the right way in the first place
const rewriteUnsignedTx = async ({
  unsignedFile,
  multisigPubkey,
  makeTempDir,
}) => {
  const unsigned = JSON.parse(await readFile(unsignedFile, 'utf8'));
  unsigned.auth_info.signer_infos[0] = {
    ...unsigned.auth_info.signer_infos[0],
    public_key: JSON.parse(multisigPubkey),
  };
  const tempDir = await makeTempDir('combine-sigs-');
  const rewrittenFile = join(tempDir, 'unsigned.json');
  await writeFile(rewrittenFile, `${JSON.stringify(unsigned, null, 2)}\n`);
  return rewrittenFile;
};

const main = async ({
  args = process.argv,
  fetch = globalThis.fetch,
  makeTempDir = prefix => mkdtemp(join(tmpdir(), prefix)),
} = {}) => {
  const cliArgs = args.slice(2);
  const {
    values: { multisig, node: nodeOverride, 'output-document': outputDocument },
    positionals,
  } = parseCliArgs(cliArgs);

  if (positionals.length < 3) {
    throw Error('expected unsigned tx path plus at least two signature paths');
  }

  const { chainName, rpcAddrs } = await fetchEnvNetworkConfig({
    env: process.env,
    fetch,
  });
  const chainId = chainName;
  const node = nodeOverride || rpcAddrs[0];

  if (!chainId || !node) {
    throw Error('missing network config');
  }

  const [unsignedFile, ...sigFiles] = positionals.map(path => resolve(path));
  const signedFile = resolve(
    dirname(unsignedFile),
    outputDocument || defaultOutputDocument(unsignedFile),
  );
  const multisigRecord = await findKeyRecord(multisig);
  const rewrittenUnsignedFile = await rewriteUnsignedTx({
    unsignedFile,
    multisigPubkey: multisigRecord.pubkey,
    makeTempDir,
  });

  await $({
    env: process.env,
    stdio: 'inherit',
    verbose: 'short',
  })`agd tx multisign ${rewrittenUnsignedFile} ${multisigRecord.name} ${sigFiles} ${flags(
    {
      'chain-id': chainId,
      node,
      'output-document': signedFile,
    },
  )}`;

  process.stdout.write(`${signedFile}\n`);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    const message =
      err instanceof Error ? (err.stack ?? err.message) : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}

export { main, parseCliArgs };
