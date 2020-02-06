import parseArgs from 'minimist';
import path from 'path';
import chalk from 'chalk';

const FAKE_CHAIN_DELAY =
  process.env.FAKE_CHAIN_DELAY === undefined
    ? 5
    : Number(process.env.FAKE_CHAIN_DELAY);
const PORT = process.env.PORT || 8000;
const HOST_PORT = process.env.HOST_PORT || PORT;

export default async function startMain(progname, rawArgs, priv, opts) {
  const { console, error, fs, spawn, os, process } = priv;
  const { reset, _: args } = parseArgs(rawArgs, {
    boolean: ['reset'],
  });

  const pspawn = (cmd, cargs, ...rest) => {
    console.log(chalk.blueBright(cmd, ...cargs));
    return new Promise((resolve, reject) => {
      const cp = spawn(cmd, cargs, ...rest);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });
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
    console.log(chalk.green('linking html directories'));
    const dappHtml = `.agservers/${name}/dapp-html`;
    const htmlWallet = `.agservers/${name}/html/wallet`;
    // await Promise.all([fs.unlink(dappHtml).catch(() => {}), fs.unlink(htmlWallet).catch(() => {})]);
    await Promise.all([
      fs.symlink('../../ui/build', dappHtml).catch(() => {}),
      fs.symlink('../../../.agwallet', htmlWallet).catch(() => {}),
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

  async function startFakeChain(profileName) {
    if (!opts.sdk) {
      if (!(await exists('.agservers/node_modules'))) {
        return error(`you must first run '${progname} install'`);
      }
    }

    const fakeGCI = 'myFakeGCI';
    if (!(await exists(agServer))) {
      console.log(chalk.yellow(`initializing ${profileName}`));
      await pspawn(agSolo, ['init', profileName, '--egresses=fake'], {
        stdio: 'inherit',
        cwd: '.agservers',
      });
    }

    console.log(
      chalk.yellow(`setting fake chain with ${FAKE_CHAIN_DELAY} second delay`),
    );
    await pspawn(
      agSolo,
      [
        'set-fake-chain',
        '--role=two_chain',
        `--delay=${FAKE_CHAIN_DELAY}`,
        fakeGCI,
      ],
      {
        stdio: 'inherit',
        cwd: agServer,
      },
    );
    await linkHtml(profileName);

    return pspawn(agSolo, ['start', '--role=two_client'], {
      stdio: 'inherit',
      cwd: agServer,
    });
  }

  async function startTestnetDocker(profileName, startArgs) {
    const IMAGE = `agoric/cosmic-swingset-setup-solo`;

    if (startArgs[0] === '--pull') {
      startArgs.shift();
      await pspawn('docker', ['pull', IMAGE], {
        stdio: 'inherit',
      });
    }

    const setupRun = (...bonusArgs) =>
      pspawn(
        'docker',
        [
          'run',
          `-p127.0.0.1:${HOST_PORT}:${PORT}`,
          `--volume=${process.cwd()}:/usr/src/dapp`,
          `-eAG_SOLO_BASEDIR=/usr/src/dapp/.agservers/${profileName}`,
          `--rm`,
          `-it`,
          IMAGE,
          `--webport=${PORT}`,
          `--webhost=0.0.0.0`,
          ...bonusArgs,
          ...startArgs,
        ],
        {
          stdio: 'inherit',
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

  async function startTestnetSdk(profileName, startArgs) {
    const virtEnv = path.resolve(
      `.agservers/ve3-${os.platform()}-${os.arch()}`,
    );
    if (!(await exists(`${virtEnv}/bin/pip`))) {
      const status = await pspawn('python3', ['-mvenv', virtEnv], {
        stdio: 'inherit',
        cwd: agSetupSolo,
      });
      if (status) {
        return status;
      }
    }

    const pipRun = (...bonusArgs) =>
      pspawn(`${virtEnv}/bin/pip`, bonusArgs, {
        stdio: 'inherit',
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
          stdio: 'inherit',
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

  const profileName = args[0] || 'dev';
  const startFn = profiles[profileName];
  if (!startFn) {
    return error(
      `unrecognized profile name ${profileName}; use one of: ${Object.keys(
        profiles,
      )
        .sort()
        .join(', ')}`,
    );
  }

  agServer = `.agservers/${profileName}`;
  if (reset) {
    console.log(chalk.green(`removing ${agServer}`));
    // rm is available on all the unix-likes, so use it for speed.
    await pspawn('rm', ['-rf', agServer], { stdio: 'inherit' });
  }

  return startFn(profileName, args[0] ? args.slice(1) : args);
}
