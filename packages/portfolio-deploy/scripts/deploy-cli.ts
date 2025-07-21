#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/debug.js';

import { fetchNetworkConfig } from '@agoric/client-utils';
import {
  installBundles,
  runBuilder,
  submitCoreEval,
  txFlags,
  waitForBlock,
} from '@agoric/deploy-script-support/src/permissioned-deployment.js';
import { toCLIOptions } from '@agoric/internal/src/cli-utils.js';
import { makeCmdRunner, makeFileRd } from '@agoric/pola-io';
import { execa } from 'execa';
import fsp from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { parseArgs, type ParseArgsConfig } from 'node:util';

const TITLE = 'ymax0 w/Noble Dollar';

const USAGE = 'deploy-cli <builder> <key=val>... [--net N] [--from K]';

const { fromEntries } = Object;

const options = /** @type {const} */ {
  net: { type: 'string', default: 'devnet' },
  from: { type: 'string', default: 'genesis' },
  title: { type: 'string', default: TITLE },
  description: { type: 'string' },
} as const satisfies ParseArgsConfig['options'];
type ParsedArgs = {
  net: string;
  from: string;
  title: string;
  description?: string;
};

const main = async (
  argv = process.argv,
  {
    fetch = globalThis.fetch,
    execFile = (cmd, args, opts) =>
      execa({ verbose: 'short' })(cmd, args, opts),
  } = {},
) => {
  const getVersion = () =>
    makeCmdRunner('git', { execFile })
      .exec('describe --tags --dirty --always'.split(' '))
      .then(it => it.stdout.trim());

  await null;
  const {
    values: { from, net, title, description = await getVersion() },
    positionals: [builder, ...bindings],
  } = parseArgs({ args: argv.slice(2), options, allowPositionals: true }) as {
    positionals: string[];
    values: ParsedArgs;
  };
  if (!builder) throw Error(USAGE);
  if (!['mainnet', 'devnet', 'local'].includes(net)) {
    throw Error(`Invalid net: ${net}. Must be 'mainnet', 'devnet', or 'local'`);
  }

  // XXX ugh. what a pain.
  const pkg = path.join(url.fileURLToPath(import.meta.url), '../../');
  process.chdir(pkg);

  // 1. build
  const pkgRd = makeFileRd(pkg, { fsp, path });
  const agoric = makeCmdRunner('npx', { execFile }).subCommand('agoric');
  const opts = fromEntries(bindings.map(b => b.split('=', 2)));
  console.log('running', builder);
  const plan = await runBuilder(agoric, pkgRd.join(builder), opts, {
    cwd: pkgRd,
  });
  console.log(`${plan.name}.js`, 'etc.');

  // 2. install bundles
  const {
    chainName: chainId,
    rpcAddrs: [node],
  } = await fetchNetworkConfig(net, { fetch });
  const agdq = makeCmdRunner('agd', { execFile }).withFlags('--node', node);
  const agdTx = agdq.withFlags(
    ...toCLIOptions(txFlags({ node, from, chainId })),
    '--yes',
  );
  for (const b of plan.bundles) {
    const shortID = b.bundleID.slice(0, 8);
    console.log('installing', shortID, '...');
    await waitForBlock(agdq);
    const [{ txhash }] = await installBundles(agdTx, [b], pkgRd);
    console.log('installed', shortID, txhash);
  }

  const timeShort = new Date().toISOString().substring(11, 16); // XXX ambient
  await waitForBlock(agdq);
  const info = await submitCoreEval(agdTx, [plan], {
    title: `${title} ${timeShort}`,
    description,
  });
  console.log(title, info);

  throw Error('TODO: wait for tx? wait for voting end?');
};

main().catch(err => {
  console.log(err);
  process.exit(1);
});
