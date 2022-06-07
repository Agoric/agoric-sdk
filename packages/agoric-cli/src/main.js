/* global process */
import { Command } from 'commander';
import path from 'path';
import { assert, details as X } from '@agoric/assert';
import cosmosMain from './cosmos.js';
import deployMain from './deploy.js';
import initMain from './init.js';
import installMain from './install.js';
import setDefaultsMain from './set-defaults.js';
import startMain from './start.js';
import followMain from './follow.js';
import walletMain from './open.js';

const DEFAULT_DAPP_TEMPLATE = 'dapp-fungible-faucet';
const DEFAULT_DAPP_URL_BASE = 'https://github.com/Agoric/';
const DEFAULT_DAPP_BRANCH = undefined;

const STAMP = '_agstate';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const main = async (progname, rawArgs, powers) => {
  const { anylogger, fs } = powers;
  const log = anylogger('agoric');

  const program = new Command();

  async function isNotBasedir() {
    try {
      await fs.stat(STAMP);
      return false;
    } catch (e) {
      log.error(`current directory wasn't created by '${progname} init'`);
      program.help();
    }
    return true;
  }

  function subMain(fn, args, options) {
    return fn(progname, args, powers, options).then(
      // This seems to be the only way to propagate the exit code.
      code => process.exit(code || 0),
    );
  }

  program.storeOptionsAsProperties(false);

  const pj = await fs.readFile(`${dirname}/../package.json`);
  const pkg = JSON.parse(pj);
  program.name(pkg.name).version(pkg.version);

  program
    .option('--sdk', 'use the Agoric SDK containing this program')
    .option('--no-sdk', 'do not use the Agoric SDK containing this program')
    .option('--docker-tag <tag>', 'image tag to use for Docker containers')
    .option(
      '-v, --verbose',
      'verbosity that can be increased',
      (_value, previous) => previous + 1,
      0,
    );

  // Add each of the commands.
  program
    .command('cosmos <command...>')
    .description('client for an Agoric Cosmos chain')
    .action(async (command, cmd) => {
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(cosmosMain, ['cosmos', ...command], opts);
    });

  program
    .command('open')
    .description('launch the Agoric UI')
    .option(
      '--hostport <host:port>',
      'host and port to connect to VM',
      '127.0.0.1:8000',
    )
    .option('--no-browser', `just display the URL, don't open a browser`)
    .option(
      '--repl [yes | only | no]',
      'whether to show the Read-eval-print loop [yes]',
      value => {
        assert(
          ['yes', 'only', 'no'].includes(value),
          X`--repl must be one of 'yes', 'no', or 'only'`,
          TypeError,
        );
        return value;
      },
    )
    .action(async cmd => {
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(walletMain, ['wallet'], opts);
    });

  program
    .command('init <project>')
    .description('create a new Dapp directory named <project>')
    .option(
      '--dapp-template <name>',
      'use the template specified by <name>',
      DEFAULT_DAPP_TEMPLATE,
    )
    .option(
      '--dapp-base <base-url>',
      'find the template relative to <base-url>',
      DEFAULT_DAPP_URL_BASE,
    )
    .option(
      '--dapp-branch <branch>',
      'use this branch instead of the repository HEAD',
      DEFAULT_DAPP_BRANCH,
    )
    .action(async (project, cmd) => {
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(initMain, ['init', project], opts);
    });

  program
    .command('set-defaults <program> <config-dir>')
    .description('update the configuration files for <program> in <config-dir>')
    .option(
      '--enable-cors',
      'open RPC and API endpoints to all cross-origin requests',
      false,
    )
    .option(
      '--export-metrics',
      'open ports to export Prometheus metrics',
      false,
    )
    .option(
      '--import-from <dir>',
      'import the exported configuration from <dir>',
    )
    .option(
      '--persistent-peers <addrs>',
      'set the config.toml p2p.persistent_peers value',
      '',
    )
    .option('--seeds <addrs>', 'set the config.toml p2p.seeds value', '')
    .option(
      '--unconditional-peer-ids <ids>',
      'set the config.toml p2p.unconditional_peer_ids value',
      '',
    )
    .action(async (prog, configDir, cmd) => {
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(setDefaultsMain, ['set-defaults', prog, configDir], opts);
    });

  program
    .command('install [force-sdk-version]')
    .description('install Dapp dependencies')
    .action(async (forceSdkVersion, cmd) => {
      await isNotBasedir();
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(installMain, ['install', forceSdkVersion], opts);
    });

  program
    .command('follow <path-spec...>')
    .description('follow an Agoric Casting leader')
    .option(
      '--integrity <strict | optimistic | none>',
      'set integrity mode',
      value => {
        assert(
          ['strict', 'optimistic', 'none'].includes(value),
          X`--integrity must be one of 'strict', 'optimistic', or 'none'`,
          TypeError,
        );
        return value;
      },
      'optimistic',
    )
    .option(
      '--sleep <seconds>',
      'sleep <seconds> between polling (may be fractional)',
      value => {
        const num = Number(value);
        assert.equal(`${num}`, value, X`--sleep must be a number`, TypeError);
        return num;
      },
      0,
    )
    .option(
      '-o, --output <format>',
      'value output format',
      value => {
        assert(
          [
            'hex',
            'justin',
            'justinlines',
            'json',
            'jsonlines',
            'text',
          ].includes(value),
          X`--output must be one of 'hex', 'justin', 'justinlines', 'json', 'jsonlines', or 'text'`,
          TypeError,
        );
        return value;
      },
      'justin',
    )
    .option('-B, --bootstrap <config>', 'network bootstrap configuration')
    .action(async (pathSpecs, cmd) => {
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(followMain, ['follow', ...pathSpecs], opts);
    });

  const addRunOptions = cmd =>
    cmd
      .option(
        '--allow-unsafe-plugins',
        `CAREFUL: installed Agoric VM plugins will also have all your user's privileges`,
        false,
      )
      .option(
        '--hostport <host:port>',
        'host and port to connect to VM',
        '127.0.0.1:8000',
      )
      .option(
        '--need <subsystems>',
        'comma-separated names of subsystems to wait for',
        'local,agoric,wallet',
      )
      .option(
        '--provide <subsystems>',
        'comma-separated names of subsystems this script initializes',
        '',
      );

  addRunOptions(
    program
      .command('run <script> [script-args...]')
      .description(
        'run a script with all your user privileges against the local Agoric VM',
      ),
  ).action(async (script, scriptArgs, cmd) => {
    const opts = { ...program.opts(), ...cmd.opts(), scriptArgs };
    return subMain(deployMain, ['run', script], opts);
  });

  addRunOptions(
    program
      .command('deploy [script...]')
      .option(
        '--target <target>',
        'One of agoric, local, cosmos, or sim',
        'agoric',
      )
      .description(
        'run multiple scripts with all your user privileges against the local Agoric VM',
      ),
  ).action(async (scripts, cmd) => {
    const opts = { ...program.opts(), ...cmd.opts() };
    return subMain(deployMain, ['deploy', ...scripts], opts);
  });

  program
    .command('start [profile] [args...]')
    .description(
      `\
start an Agoric VM

agoric start - runs the default profile (dev)
agoric start dev -- [initArgs] - simulated chain and solo VM
agoric start local-chain [portNum] -- [initArgs] - local chain
agoric start local-solo [portNum] [provisionPowers] - local solo VM
`,
    )
    .option('-d, --debug', 'run in JS debugger mode')
    .option('--reset', 'clear all VM state before starting')
    .option('--no-restart', 'do not actually start the VM')
    .option('--pull', 'for Docker-based VM, pull the image before running')
    .option('--rebuild', 'rebuild VM dependencies before running')
    .option(
      '--delay [seconds]',
      'delay for simulated chain to process messages',
    )
    .option(
      '--inspect [host[:port]]',
      'activate inspector on host:port (default: "127.0.0.1:9229")',
    )
    .option(
      '--inspect-brk [host[:port]]',
      'activate inspector on host:port and break at start of script (default: "127.0.0.1:9229")',
    )
    .option(
      '--wallet <package>',
      'install the wallet from NPM package <package>',
      '@agoric/wallet-frontend',
    )
    .action(async (profile, args, cmd) => {
      await isNotBasedir();
      const opts = { ...program.opts(), ...cmd.opts() };
      return subMain(startMain, ['start', profile, ...args], opts);
    });

  // Throw an error instead of exiting directly.
  program.exitOverride();

  // Hack: cosmos arguments are always unparsed.
  const cosmosIndex = rawArgs.indexOf('cosmos');
  if (cosmosIndex >= 0) {
    rawArgs.splice(cosmosIndex + 1, 0, '--');
  }

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
