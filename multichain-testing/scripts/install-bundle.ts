#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/debug.js';

import {
  installBundle,
  txFlags,
} from '@agoric/deploy-script-support/src/permissioned-deployment.js';
import { makeCmdRunner, makeFileRd } from '@agoric/pola-io';
import { execa } from 'execa';
import { toCLIOptions } from '@agoric/internal';
import { fetchEnvNetworkConfig } from '@agoric/client-utils';

const Usage = '_script_ bundle.json';

const main = async (
  argv = process.argv,
  env = process.env,
  {
    execFile = (cmd, args, opts) =>
      execa({ verbose: 'short' })(cmd, args, opts),
    fetch = globalThis.fetch,
  } = {},
) => {
  const [bundleFn] = argv.slice(2);
  if (!bundleFn) throw Error(Usage);

  const {
    chainName: chainId,
    rpcAddrs: [node],
  } = await fetchEnvNetworkConfig({ env, fetch });
  const agdq = makeCmdRunner('agd', { execFile }).withFlags('--node', node);
  const from = 'gov2'; // XXX
  const agdTx = agdq.withFlags(
    ...toCLIOptions(txFlags({ node, from, chainId })),
    '--yes',
  );

  await installBundle(agdTx, makeFileRd(bundleFn));
  console.warn('TODO: wait for confirmation/error in vstorage');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
