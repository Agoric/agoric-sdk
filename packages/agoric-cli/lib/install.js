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
    const sdkPackagesDir = path.resolve(__dirname, '../../../packages');
    const allPackages = await fs.readdir(sdkPackagesDir);
    const packages = new Map();
    for (const pkg of allPackages) {
      const dir = `${sdkPackagesDir}/${pkg}`;
      let packageJSON;
      try {
        packageJSON = await fs.readFile(`${dir}/package.json`);
      } catch (e) {
        continue;
      }
      if (packageJSON) {
        const pj = JSON.parse(packageJSON);
        if (!pj.private) {
          if (await pspawn('yarn', ['link'], { stdio: 'inherit', cwd: dir })) {
            log.error('Cannot yarn link', dir);
            return 1;
          }
          packages.set(pkg, pj.name);
        }
      }
    }
    await Promise.all(
      subdirs.map(subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm}`));
        return rimraf(nm);
      }),
    );
    const sdkPackages = [...packages.values()].sort();
    for (const subdir of subdirs) {
      if (await pspawn('yarn', ['link', ...sdkPackages], { stdio: 'inherit', cwd: subdir })) {
        log.error('Cannot yarn link', ...sdkPackages);
        return 1;
      }
    }
  } else {
    // Delete all old node_modules.
    await Promise.all(
      subdirs.map(subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm}`));
        return rimraf(nm);
      }),
    );
  }

  if (await pspawn('yarn', ['install'], { stdio: 'inherit' })) {
    // Try to install via Yarn.
    log.error('Cannot yarn install');
    return 1;
  }

  if (await pspawn('yarn', ['install'], { stdio: 'inherit', cwd: 'ui' })) {
    // Try to install via Yarn.
    log.warn('Cannot yarn install in ui directory');
    return 1;
  }

  log.info(chalk.bold.green('Done installing'));
  return 0;
}
