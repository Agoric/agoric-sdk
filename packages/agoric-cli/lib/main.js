import chalk from 'chalk';
import { Command } from 'commander';

const DEFAULT_DAPP_TEMPLATE = 'dapp-encouragement';
const DEFAULT_DAPP_URL_BASE = 'git://github.com/Agoric/';

const STAMP = '_agstate';

const main = async (progname, rawArgs, powers) => {
  const { anylogger, stdout, fs } = powers;
  const log = anylogger('agoric');

  const isNotBasedir = async () => {
    try {
      await fs.stat(STAMP);
      return false;
    } catch (e) {
      log.error(`current directory wasn't created by '${progname} init'`);
      return usage(1);
    }
  };
  
  const subMain = (fn, args, options) => {
    return fn(progname, args, powers, options);
  };

  const program = new Command();
  const pj = await fs.readFile(`${__dirname}/../package.json`);
  const pkg = JSON.parse(pj);

  program
    .storeOptionsAsProperties(false);

  program
    .name(pkg.name)
    .version(pkg.version);

  program
    .option('--sdk', 'use the Agoric SDK containing this program')
    .option('-v, --verbose', 'verbosity that can be increased',
      (_value, previous) => previous + 1, 0);

  // Add each of the commands.
  program
    .command('init <project>')
    .description('create a new Dapp directory named <project>')
    .option('--dapp-template <name>', 'use the template specified by <name>', DEFAULT_DAPP_TEMPLATE)
    .option('--dapp-base <base-url>', 'find the template relative to <base-url>', DEFAULT_DAPP_URL_BASE)
    .action(async (project, cmd) => {
      const opts = {...program.opts(), ...cmd.opts()};
      const mod = await import('./init');
      return subMain(mod.default, ['init', project], opts);
    });

  program
    .command('install')
    .description('install Dapp dependencies')
    .action(async (cmd) => {
      await isNotBasedir();
      const opts =  {...program.opts(), ...cmd.opts()};
      const mod = await import('./install');
      return subMain(mod.default, ['install'], opts);
    });


  program
    .command('deploy <script...>')
    .description('run a deployment script against the local Agoric VM')
    .option('--hostport <HOST:PORT>', 'host and port to connect to VM', '127.0.0.1:8000')
    .action(async (scripts, cmd) => {
      const opts =  {...program.opts(), ...cmd.opts()};
      const mod = await import('./deploy');
      return subMain(mod.default, ['deploy', ...scripts], opts);
    });
  
  program
    .command('start [profile] [args...]')
    .description('run an Agoric VM')
    .option('--reset', 'clear all VM state before starting')
    .option('--no-restart', 'do not actually start the VM')
    .option('--pull', 'for Docker-based VM, pull the image before running')
    .option('--delay [seconds]', 'delay for simulated chain to process messages')
    .option('--inspect [host[:port]]', 'activate inspector on host:port (default: "127.0.0.1:9229")')
    .option('--inspect-brk [host[:port]]', 'activate inspector on host:port and break at start of script (default: "127.0.0.1:9229")')
    .action(async (profile, args, cmd) => {
      await isNotBasedir();
      const opts =  {...program.opts(), ...cmd.opts()};
      const mod = await import('./start');
      return subMain(mod.default, ['start', profile, ...args], opts);
    });

  // Throw an error instead of exiting directly.
  program.exitOverride();

  try {
    await program.parseAsync(rawArgs, { from: 'user' });
  } catch (e) {
    if (e && e.name === 'CommanderError') {
      return e.exitCode;
    }
    throw e;
  }
  return 0;
};

export default main;
