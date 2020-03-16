import parseArgs from 'minimist';
import path from 'path';
import chalk from 'chalk';

export default async function installMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn } = powers;
  const log = anylogger('agoric:install');

  const { _: _args } = parseArgs(rawArgs);

  const pspawn = (...args) =>
    new Promise((resolve, _reject) => {
      const cp = spawn(...args);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  if (opts.sdk) {
    const sdkNodeModules = path.resolve(__dirname, '../../../node_modules');
    await Promise.all(
      ['_agstate/agoric-servers', 'contract', 'api'].sort().map(subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`link SDK ${nm}`));
        return fs
          .unlink(nm)
          .catch(_ => {})
          .then(_ => fs.symlink(sdkNodeModules, nm));
      }),
    );

    log(chalk.bold.green(`link SDK _agstate/agoric-wallet`));
    await fs.unlink(`_agstate/agoric-wallet`).catch(_ => {});
    try {
      const agWallet = path.resolve(__dirname, '../../frontend-wallet/build');
      await fs.stat(`${agWallet}/index.html`);
      await fs.symlink(agWallet, `_agstate/agoric-wallet`);
    } catch (e) {
      const agWallet = path.resolve(__dirname, '../agoric-wallet-build');
      await fs.symlink(agWallet, `_agstate/agoric-wallet`);
    }
  } else if (await pspawn('yarn', ['install'], { stdio: 'inherit' })) {
    // Try to install via Yarn.
    log.error('Cannot yarn install');
    return 1;
  } else {
    // FIXME: Copy the agoric-wallet-build more portably
    const agWallet = path.resolve(__dirname, '../agoric-wallet-build');
    if (await pspawn('cp', ['-a', agWallet, '_agstate/agoric-wallet'])) {
      log.error('Cannot copy _agstate/agoric-wallet');
    }
  }
  log(chalk.bold.green('Done installing'));
  return 0;
}
