import chalk from 'chalk';
import parseArgs from 'minimist';
import fs from 'fs';

const VERSION = 'Agoric <some version>';
const STAMP = '.agservers';

const main = async (progname, rawArgs, privs) => {
  const { console, error } = privs;
  const { _: args, ...opts } = parseArgs(rawArgs, {
    boolean: ['version', 'help'],
    stopEarly: true,
  });

  const isNotBasedir = async () => {
    try {
      await fs.promises.stat('.agservers');
      return false;
    } catch (e) {
      error(`current directory wasn't created by '${progname} init'`);
      return usage(1);
    }
  };
  
  const subMain = (fn, args) => {
    const subError = (...rest) => error(`${args[0]}:`, ...rest);
    return fn(progname, args.slice(1), { ...privs, error: subError });
  };

  const usage = status => {
    if (status) {
      console.error(chalk.bold.yellow(`Type '${progname} --help' for more information.`));
      return status;
    }
    console.log(`\
Usage: ${progname} [command] [...args]

Manage the Agoric Javascript smart contract platform.

deploy    upload dapp to started Agoric servers
help      display this help and exit
init      initialize a dapp project
install   load dapp dependencies
start     run Agoric servers
`);
    return 0;
  };

  if (opts.version) {
    console.log(VERSION);
    return 0;
  }

  if (opts.help) {
    return usage(0);
  }

  const cmd = args[0];
  switch (cmd) {
    case undefined:
      error(`you must specify a COMMAND`);
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
      error(`unrecognized COMMAND`, cmd);
      return usage(1);
  }
};

export default main;
