import path from 'path';
import chalk from 'chalk';

const FAKE_CHAIN_DELAY =
  process.env.FAKE_CHAIN_DELAY === undefined
    ? 0
    : Number(process.env.FAKE_CHAIN_DELAY);
const PORT = process.env.PORT || 8000;
const HOST_PORT = process.env.HOST_PORT || PORT;

export default async function startMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn, os, process } = powers;
  const log = anylogger('agoric:start');

  const pspawnEnv = { ...process.env };
  const pspawn = (
    cmd,
    cargs,
    { stdio = 'inherit', env = pspawnEnv, ...rest } = {},
  ) => {
    log.info(chalk.blueBright(cmd, ...cargs));
    const cp = spawn(cmd, cargs, { stdio, env, ...rest });
    const pr = new Promise((resolve, _reject) => {
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });
    pr.cp = cp;
    return pr;
  };

  const exists = async file => {
    try {
      await fs.stat(file);
      return true;
    } catch (e) {
      return false;
    }
  };

  const linkHtml = async name => {
    log(chalk.green('linking html directories'));
    // const dappHtml = `_agstate/agoric-servers/${name}/dapp-html`;
    const htmlWallet = `_agstate/agoric-servers/${name}/html/wallet`;
    // await Promise.all([fs.unlink(dappHtml).catch(() => {}), fs.unlink(htmlWallet).catch(() => {})]);
    await Promise.all([
      // fs.symlink('../../../ui/build', dappHtml).catch(() => {}),
      fs
        .unlink(htmlWallet)
        .catch(_ => {})
        .then(_ =>
          fs.symlink('../../../../_agstate/agoric-wallet', htmlWallet),
        ),
    ]);
  };

  let agSolo;
  let agSetupSolo;
  let agServer;
  if (opts.sdk) {
    agSolo = path.resolve(__dirname, '../../cosmic-swingset/bin/ag-solo');
    agSetupSolo = path.resolve(__dirname, '../../cosmic-swingset/setup-solo');
  } else {
    agSolo = `${process.cwd()}/node_modules/@agoric/cosmic-swingset/bin/ag-solo`;
  }

  async function startFakeChain(profileName, _startArgs, popts) {
    const fakeDelay =
      popts.delay === undefined ? FAKE_CHAIN_DELAY : Number(popts.delay);

    if (!opts.sdk) {
      if (
        !(await exists('node_modules/@agoric/cosmic-swingset')) &&
        !(await exists(
          '_agstate/agoric-servers/node_modules/@agoric/cosmic-swingset',
        ))
      ) {
        log.error(`you must first run '${progname} install'`);
        return 1;
      }
    }

    const fakeGCI = 'fake-chain';
    if (!(await exists(agServer))) {
      log(chalk.yellow(`initializing ${profileName}`));
      await pspawn(agSolo, ['init', profileName, '--egresses=fake'], {
        cwd: '_agstate/agoric-servers',
      });
    }

    if (fakeDelay >= 0) {
      log(chalk.yellow(`setting fake chain with ${fakeDelay} second delay`));
      await pspawn(
        agSolo,
        ['set-fake-chain', '--role=two_chain', `--delay=${fakeDelay}`, fakeGCI],
        {
          cwd: agServer,
        },
      );
    }
    await linkHtml(profileName);

    if (!popts.restart) {
      // Don't actually run the chain.
      return 0;
    }

    const ps = pspawn(agSolo, ['start', '--role=two_client'], {
      cwd: agServer,
    });
    process.on('SIGINT', () => ps.cp.kill('SIGINT'));
    return ps;
  }

  async function startTestnetDocker(profileName, startArgs, popts) {
    const IMAGE = `agoric/cosmic-swingset-setup-solo`;

    if (popts.pull) {
      const status = await pspawn('docker', ['pull', IMAGE]);
      if (status) {
        return status;
      }
    }

    const setupRun = (...bonusArgs) =>
      pspawn('docker', [
        'run',
        `-p127.0.0.1:${HOST_PORT}:${PORT}`,
        `--volume=${process.cwd()}:/usr/src/dapp`,
        `-eAG_SOLO_BASEDIR=/usr/src/dapp/_agstate/agoric-servers/${profileName}`,
        `--rm`,
        `-it`,
        IMAGE,
        `--webport=${PORT}`,
        `--webhost=0.0.0.0`,
        ...bonusArgs,
        ...startArgs,
      ]);

    if (!(await exists(agServer))) {
      const status =
        (await setupRun('--no-restart')) || (await linkHtml(profileName));
      if (status) {
        return status;
      }
    }

    return setupRun();
  }

  async function startTestnetSdk(profileName, startArgs) {
    const virtEnv = path.resolve(
      `_agstate/agoric-servers/ve3-${os.platform()}-${os.arch()}`,
    );
    if (!(await exists(`${virtEnv}/bin/pip`))) {
      const status = await pspawn('python3', ['-mvenv', virtEnv], {
        cwd: agSetupSolo,
      });
      if (status) {
        return status;
      }
    }

    const pipRun = (...bonusArgs) =>
      pspawn(`${virtEnv}/bin/pip`, bonusArgs, {
        cwd: agSetupSolo,
      });

    if (!(await exists(`${virtEnv}/bin/wheel`))) {
      const status = await pipRun('install', 'wheel');
      if (status) {
        return status;
      }
    }

    if (!(await exists(`${virtEnv}/bin/ag-setup-solo`))) {
      const status = await pipRun('install', `--editable`, '.');
      if (status) {
        return status;
      }
    }

    const setupRun = (...bonusArgs) =>
      pspawn(
        `${virtEnv}/bin/ag-setup-solo`,
        [`--webport=${PORT}`, ...bonusArgs, ...startArgs],
        {
          env: { ...process.env, AG_SOLO_BASEDIR: agServer },
        },
      );

    if (!(await exists(agServer))) {
      const status =
        (await setupRun('--no-restart')) || (await linkHtml(profileName));
      if (status) {
        return status;
      }
    }

    return setupRun();
  }

  const profiles = {
    dev: startFakeChain,
    testnet: opts.sdk ? startTestnetSdk : startTestnetDocker,
  };

  const popts = opts;

  if (popts.debug) {
    // Crank out the debugging.
    pspawnEnv.DEBUG = 'agoric';
  } else {
    pspawnEnv.DEBUG = '';
  }

  const args = rawArgs.slice(1);
  const profileName = args[0] || 'dev';
  const startFn = profiles[profileName];
  if (!startFn) {
    log.error(
      `unrecognized profile name ${profileName}; use one of: ${Object.keys(
        profiles,
      )
        .sort()
        .join(', ')}`,
    );
    return 1;
  }

  agServer = `_agstate/agoric-servers/${profileName}`;

  if (popts.reset) {
    log(chalk.green(`removing ${agServer}`));
    // rm is available on all the unix-likes, so use it for speed.
    await pspawn('rm', ['-rf', agServer]);
  }

  return startFn(profileName, args[0] ? args.slice(1) : args, popts);
}
