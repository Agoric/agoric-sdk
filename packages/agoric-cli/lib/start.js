 import parseArgs from 'minimist';
import chalk from 'chalk';

export default async function startMain(progname, rawArgs, priv, opts) {
  const { console, error, fs, spawn, process } = priv;
  const {
    reset,
    _: args,
  } = parseArgs(rawArgs, {
    boolean: ['reset'],
  });

  const pspawn = (...args) =>
    new Promise((resolve, reject) => {
      const cp = spawn(...args);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  const exists = async file => {
    try {
      await fs.stat(file);
      return true;
    } catch (e) {
      return false;
    }
  };

  let agSolo;
  if (opts.sdk) {
    agSolo = `${__dirname}/../../cosmic-swingset/bin/ag-solo`;
  } else {
    if (!await exists('.agservers/node_modules')) {
      return error(`you must first run '${progname} install'`);
    }
    agSolo = `${process.cwd()}/node_modules/@agoric/cosmic-swingset/bin/ag-solo`;
  }

  if (reset) {
    console.log(chalk.green('removing .agservers/solo'));
    await pspawn('rm', ['-rf', '.agservers/solo'], { stdio: 'inherit' });
  }

  // Run scenario3.
  if (!await exists('.agservers/solo')) {
    console.log(chalk.yellow('initializing solo'))
    await pspawn(agSolo, ['init', 'solo', '--egresses=none'], {
      stdio: 'inherit',
      cwd: '.agservers',
    });
  }

  console.log(chalk.green('linking html directories'));
  const dappHtml = '.agservers/solo/dapp-html';
  const htmlWallet = '.agservers/solo/html/wallet';
  // await Promise.all([fs.unlink(dappHtml).catch(() => {}), fs.unlink(htmlWallet).catch(() => {})]);
  await Promise.all([
    fs.symlink('../../ui/build', dappHtml).catch(() => {}),
    fs.symlink('../../../.agwallet', htmlWallet).catch(() => {}),
  ]);

  await pspawn(agSolo, ['start', '--role=three_client'], {
    stdio: 'inherit',
    cwd: '.agservers/solo',
  });
}
