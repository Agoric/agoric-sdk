import chalk from 'chalk';
import parseArgs from 'minimist';

const VERSION = 'Agoric <some version>';
const STAMP = '_agstate';

const main = async (progname, rawArgs, powers) => {
  const { anylogger, stdout, fs } = powers;
  const log = anylogger('agoric');
  const { _: args, ...opts } = parseArgs(rawArgs, {
    boolean: ['version', 'help', 'sdk'],
    stopEarly: true,
  });

  const isNotBasedir = async () => {
    try {
      await fs.stat(STAMP);
      return false;
    } catch (e) {
      log.error(`current directory wasn't created by '${progname} init'`);
      return usage(1);
    }
  };
  
  const subMain = (fn, args) => {
    return fn(progname, args.slice(1), powers, opts);
  };

  const usage = status => {
    if (status) {
      log.error(chalk.bold.yellow(`Type '${progname} --help' for more information.`));
      return status;
    }
    stdout(`\
Usage: ${progname} [command] [...args]

Manage the Agoric Javascript smart contract platform.

deploy    upload dapp to started Agoric servers
help      display this help and exit
init      initialize a dApp project
install   load dApp dependencies
start     run Agoric servers
`);
    return 0;
  };

  if (opts.version) {
    stdout(`${VERSION}\n`);
    return 0;
  }

  if (opts.help) {
    return usage(0);
  }

  const cmd = args[0];
  switch (cmd) {
    case undefined:
      log.error(`you must specify a COMMAND`);
      return usage(1);
    case 'help':
      return usage(0);
    case 'deploy':
      return subMain((await import('./deploy')).default, args);
    case 'install':
      return await isNotBasedir() || subMain((await import('./install')).default, args);
    case 'start':
      return await isNotBasedir() || subMain((await import('./start')).default, args);
    case 'init':
      return subMain((await import('./init')).default, args);
    default:
      log.error(`unrecognized COMMAND`, cmd);
      return usage(1);
  }
};

export default main;
