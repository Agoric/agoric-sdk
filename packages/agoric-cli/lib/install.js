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
  }

  if (await pspawn('yarn', ['install'], { stdio: 'inherit', cwd: 'ui' })) {
    // Try to install via Yarn.
    log.warn('Cannot yarn install in ui directory');
    return 1;
  }

  log.info(chalk.bold.green('Done installing'));
  return 0;
}
