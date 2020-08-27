import chalk from 'chalk';

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

  const pspawn = (
    cmd,
    cargs,
    { stdio = 'inherit', env = pspawnEnv, ...rest } = {},
  ) => {
    log.debug(chalk.blueBright(cmd, ...cargs));
    const cp = spawn(cmd, cargs, { stdio, env, ...rest });
    const pr = new Promise((resolve, _reject) => {
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });
    pr.cp = cp;
    return pr;
  };

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
