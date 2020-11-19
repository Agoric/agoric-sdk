import chalk from 'chalk';
import { makePspawn } from './helpers';

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
      return pspawn('ag-cosmos-helper', args, hopts);
    }

    // Don't allocate a TTY if we're not talking to one.
    const ttyFlag = process.stdin.isTTY && process.stdout.isTTY ? '-it' : '-i';

    return pspawn(
      'docker',
      [
        'run',
        `--volume=ag-chain-cosmos-state:/root/.ag-chain-cosmos`,
        '--rm',
        ttyFlag,
        '--entrypoint=ag-cosmos-helper',
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
