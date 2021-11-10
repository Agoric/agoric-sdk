import chalk from 'chalk';
import { makePspawn, getSDKBinaries } from './helpers.js';

export default async function cosmosMain(progname, rawArgs, powers, opts) {
  const IMAGE = `agoric/agoric-sdk`;
  const { anylogger, spawn, process } = powers;
  const log = anylogger('agoric:cosmos');

  const popts = opts;

  const pspawnEnv = { ...process.env };
  if (popts.verbose > 1) {
    // Enable verbose logs.
    pspawnEnv.DEBUG = 'agoric';
  } else if (!popts.verbose) {
    // Disable more logs.
    pspawnEnv.DEBUG = '';
  }

  const pspawn = makePspawn({ env: pspawnEnv, log, spawn, chalk });

  function helper(args, hopts = undefined) {
    if (opts.sdk) {
      const { cosmosHelper } = getSDKBinaries();
      return pspawn(cosmosHelper, args, hopts);
    }

    // Don't allocate a TTY if we're not talking to one.
    const ttyFlag = process.stdin.isTTY && process.stdout.isTTY ? '-it' : '-i';

    return pspawn(
      'docker',
      [
        'run',
        `--volume=agoric-state:/root/.agoric`,
        '--rm',
        ttyFlag,
        '--entrypoint=agd',
        IMAGE,
        ...args,
      ],
      hopts,
    );
  }

  if (popts.pull) {
    const exitStatus = await pspawn('docker', ['pull', IMAGE]);
    if (exitStatus) {
      return exitStatus;
    }
  }

  return helper(rawArgs.slice(1));
}
