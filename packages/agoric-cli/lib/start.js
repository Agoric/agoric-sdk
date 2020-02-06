import parseArgs from 'minimist';
import path from 'path';
import chalk from 'chalk';

const FAKE_CHAIN_DELAY = 5;

export default async function startMain(progname, rawArgs, priv, opts) {
  const { console, error, fs, spawn, process } = priv;
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
  let agServer;
  if (opts.sdk) {
    agSolo = path.resolve(__dirname, '../../cosmic-swingset/bin/ag-solo');
  } else {
    if (!(await exists('.agservers/node_modules'))) {
      return error(`you must first run '${progname} install'`);
    }
    agSolo = `${process.cwd()}/node_modules/@agoric/cosmic-swingset/bin/ag-solo`;
  }

  async function startDev(profileName) {
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

    await pspawn(agSolo, ['start', '--role=two_client'], {
      stdio: 'inherit',
      cwd: agServer,
    });
  }

  async function startTestnet(profileName) {

  }

  const profiles = {
    dev: startDev,
    testnet: startTestnet,
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
    // FIXME: Use portable rimraf.
    await pspawn('rm', ['-rf', agServer], { stdio: 'inherit' });
  }

  await startFn(profileName, agServer);
}
