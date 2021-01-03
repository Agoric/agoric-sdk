import path from 'path';
import chalk from 'chalk';
import { makePspawn } from './helpers';

export default async function installMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn } = powers;
  const log = anylogger('agoric:install');

  // Notify the preinstall guard that we are running.
  process.env.AGORIC_INSTALL = 'true';

  const pspawn = makePspawn({ log, spawn, chalk });

  const rimraf = file => pspawn('rm', ['-rf', file]);
  const existingSubdirs = await Promise.all(
    ['.', '_agstate/agoric-servers', 'contract', 'api', 'ui']
      .sort()
      .map(async subd => {
        const exists = await fs.stat(`${subd}/package.json`).catch(_ => false);
        return exists && subd;
      }),
  );
  const subdirs = existingSubdirs.filter(subd => subd);

  const linkFolder = path.resolve(`_agstate/yarn-links`);
  const linkFlags = [`--link-folder=${linkFolder}`];
  let packages;

  if (opts.sdk) {
    packages = new Map();
    const versions = new Map();
    log('removing', linkFolder);
    await rimraf(linkFolder);
    await Promise.all(
      ['packages', 'golang'].map(async pkgSubdir => {
        const pkgRoot = path.resolve(__dirname, `../../../${pkgSubdir}`);
        const allPackages = await fs.readdir(pkgRoot);
        await Promise.all(
          allPackages.map(async pkg => {
            const dir = `${pkgRoot}/${pkg}`;
            const packageJSON = await fs
              .readFile(`${dir}/package.json`, 'utf-8')
              .catch(err => log('error reading', `${dir}/package.json`, err));
            if (!packageJSON) {
              return undefined;
            }

            const pj = JSON.parse(packageJSON);
            if (pj.private) {
              log('not linking private package', pj.name);
              return undefined;
            }

            // Save our metadata.
            packages.set(pkg, pj.name);
            versions.set(pj.name, pj.version);

            const SUBOPTIMAL = false;
            if (SUBOPTIMAL) {
              // This use of yarn is noisy and slow.
              return pspawn('yarn', [...linkFlags, 'link'], {
                stdio: 'inherit',
                cwd: dir,
              });
            }

            // This open-coding of the above yarn command is quiet and fast.
            const linkName = `${linkFolder}/${pj.name}`;
            const linkDir = path.dirname(linkName);
            log('linking', linkName);
            return fs
              .mkdir(linkDir, { recursive: true })
              .then(_ => fs.symlink(path.relative(linkDir, dir), linkName));
          }),
        );
      }),
    );
    await Promise.all(
      subdirs.map(async subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm} link`));
        await fs.unlink(nm).catch(_ => {});

        // Mark all the SDK package dependencies as wildcards.
        const pjson = `${subdir}/package.json`;
        const packageJSON = await fs
          .readFile(pjson, 'utf-8')
          .catch(_ => undefined);
        if (!packageJSON) {
          return;
        }
        const pj = JSON.parse(packageJSON);
        for (const section of ['dependencies', 'devDependencies']) {
          const deps = pj[section];
          if (deps) {
            for (const pkg of Object.keys(deps)) {
              if (versions.has(pkg)) {
                deps[pkg] = `*`;
              }
            }
          }
        }
        log.info(`updating ${pjson}`);
        await fs.writeFile(pjson, `${JSON.stringify(pj, null, 2)}\n`);
      }),
    );
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

  const yarnInstall = await pspawn('yarn', [...linkFlags, 'install'], {
    stdio: 'inherit',
  });
  if (yarnInstall) {
    // Try to install via Yarn.
    log.error('Cannot yarn install');
    return 1;
  }

  if (packages) {
    const sdkPackages = [...packages.values()].sort();
    for (const subdir of subdirs) {
      if (
        // eslint-disable-next-line no-await-in-loop
        await pspawn('yarn', [...linkFlags, 'link', ...sdkPackages], {
          stdio: 'inherit',
          cwd: subdir,
        })
      ) {
        log.error('Cannot yarn link', ...sdkPackages);
        return 1;
      }
    }
  }

  // Try to install via Yarn.
  const yarnInstallUi = await (subdirs.includes('ui') &&
    pspawn('yarn', [...linkFlags, 'install'], {
      stdio: 'inherit',
      cwd: 'ui',
    }));
  if (yarnInstallUi) {
    log.warn('Cannot yarn install in ui directory');
    return 1;
  }

  log.info(chalk.bold.green('Done installing'));
  return 0;
}
