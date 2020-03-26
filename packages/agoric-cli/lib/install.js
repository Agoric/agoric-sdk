import path from 'path';
import chalk from 'chalk';

export default async function installMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn } = powers;
  const log = anylogger('agoric:install');

  const pspawn = (...args) =>
    new Promise((resolve, _reject) => {
      const cp = spawn(...args);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  const rimraf = file => pspawn('rm', ['-rf', file]);
  const subdirs = ['.', '_agstate/agoric-servers', 'contract', 'api'].sort();

  if (opts.sdk) {
    const sdkNodeModules = path.resolve(__dirname, '../../../node_modules');
    await Promise.all(
      subdirs.map(subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm}`));
        return rimraf(nm).then(_ => {
          log(chalk.bold.green(`link SDK ${nm}`));
          return fs.symlink(sdkNodeModules, nm);
        });
      }),
    );

    log(chalk.bold.green(`link SDK _agstate/agoric-wallet`));
    await rimraf('_agstate/agoric-wallet');
    const agWallet = path.resolve(__dirname, '../agoric-wallet-build');
    try {
      await fs.stat(`${agWallet}/index.html`);
      await fs.symlink(agWallet, `_agstate/agoric-wallet`);
    } catch (e) {
      await fs.symlink(agWallet, `_agstate/agoric-wallet`);
    }
  } else {
    // Delete any symlinks.
    await Promise.all(
      subdirs.map(subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm}`));
        return fs.unlink(nm).catch(_ => {});
      }),
    );

    if (await pspawn('yarn', ['install'], { stdio: 'inherit' })) {
      // Try to install via Yarn.
      log.error('Cannot yarn install');
      return 1;
    }

    // FIXME: Copy the agoric-wallet-build more portably
    log(chalk.bold.green(`copy bundled _agstate/agoric-wallet`));
    await rimraf('_agstate/agoric-wallet');
    const agWallet = path.resolve(__dirname, '../agoric-wallet-build');
    if (await pspawn('cp', ['-a', agWallet, '_agstate/agoric-wallet'])) {
      log.error('Cannot copy _agstate/agoric-wallet');
    }
  }
  log.info(chalk.bold.green('Done installing'));
  return 0;
}
