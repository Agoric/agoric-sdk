/* global process Buffer */
import path from 'path';
import chalk from 'chalk';
import { makePspawn } from './helpers.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

export default async function installMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn } = powers;
  const log = anylogger('agoric:install');

  const forceSdkVersion = rawArgs[1];

  // Notify the preinstall guard that we are running.
  process.env.AGORIC_INSTALL = 'true';

  // Node 16 requires this to be set for C++ addons to compile.
  if (process.env.CXXFLAGS === undefined) {
    process.env.CXXFLAGS = '-std=c++14';
  }

  const pspawn = makePspawn({ log, spawn, chalk });

  const rimraf = file => pspawn('rm', ['-rf', file]);

  async function workspaceDirectories(cwd = '.') {
    // run `yarn workspaces info` to get the list of directories to
    // use, instead of a hard-coded list
    const p = pspawn('yarn', ['workspaces', '--silent', 'info'], {
      cwd,
      stdio: ['inherit', 'pipe', 'inherit'],
    });
    const stdout = [];
    p.childProcess.stdout.on('data', out => stdout.push(out));
    await p;
    const d = JSON.parse(Buffer.concat(stdout).toString('utf-8'));
    const subdirs = Object.values(d).map(v => v.location);
    return subdirs;
  }

  let subdirs;
  let sdkWorktree;
  const dappPackageJSON = await fs
    .readFile(`package.json`, 'utf-8')
    .then(data => JSON.parse(data))
    .catch(err => log('error reading', `package.json`, err));
  if (dappPackageJSON.useWorkspaces) {
    const workdirs = await workspaceDirectories();
    sdkWorktree = workdirs.find(subd => subd === 'agoric-sdk');
    subdirs = ['.', ...workdirs.filter(subd => subd !== 'agoric-sdk')];
  } else {
    const existingSubdirs = await Promise.all(
      ['.', '_agstate/agoric-servers', 'contract', 'api', 'ui']
        .sort()
        .map(async subd => {
          const exists = await fs
            .stat(`${subd}/package.json`)
            .catch(_ => false);
          return exists && subd;
        }),
    );
    subdirs = existingSubdirs.filter(subd => subd);
  }

  const linkFolder = path.resolve(`_agstate/yarn-links`);
  const linkFlags = [`--link-folder=${linkFolder}`];

  const packages = new Map();
  const versions = new Map();
  const dirPackages = [];
  if (opts.sdk) {
    // We remove all the links to prevent `yarn install` below from corrupting
    // them.
    log('removing', linkFolder);
    await rimraf(linkFolder);

    const sdkRoot = path.resolve(dirname, `../../..`);
    const sdkDirs = await workspaceDirectories(sdkRoot);
    await Promise.all(
      sdkDirs.map(async location => {
        const dir = `${sdkRoot}/${location}`;
        const packageJSON = await fs
          .readFile(`${dir}/package.json`, 'utf-8')
          .catch(err => log('error reading', `${dir}/package.json`, err));
        if (!packageJSON) {
          return;
        }

        const pj = JSON.parse(packageJSON);
        if (pj.private) {
          log('not linking private package', pj.name);
          return;
        }

        // Save our metadata.
        dirPackages.push([dir, pj.name]);
        packages.set(dir, pj.name);
        versions.set(pj.name, pj.version);
      }),
    );

    // Link the SDK.
    if (sdkWorktree) {
      await fs.unlink(sdkWorktree).catch(_ => {});
      await fs.symlink(sdkRoot, sdkWorktree);
    }

    const updatesTodo = [];
    const removesTodo = [];
    await Promise.all(
      subdirs.map(async subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm} link`));
        await fs.unlink(nm).catch(_ => {});

        // Remove all the package links.
        // This is needed to prevent yarn errors when installing new versions of
        // linked modules (like `@agoric/zoe`).
        await Promise.all(
          dirPackages.map(async ([_dir, pjName]) =>
            fs.unlink(`${nm}/${pjName}`).catch(_ => {}),
          ),
        );

        if (forceSdkVersion === undefined) {
          // No need to change package.json.
          return;
        }

        // Modify all the SDK package versions.
        const pjson = `${subdir}/package.json`;
        const packageJSON = await fs
          .readFile(pjson, 'utf-8')
          .catch(_ => undefined);
        if (!packageJSON) {
          return;
        }
        const obsolete = new Set();
        const pj = JSON.parse(packageJSON);
        for (const section of ['dependencies', 'devDependencies']) {
          const deps = pj[section];
          if (deps) {
            for (const pkg of Object.keys(deps)) {
              if (versions.has(pkg)) {
                if (deps[pkg] === forceSdkVersion) {
                  // We need to remove the old package, or the install will not
                  // pick up the newly-published one.
                  obsolete.add(pkg);
                }
                deps[pkg] = forceSdkVersion;
              }
            }
          }
        }
        // Ensure we update the package.json before exiting.
        const updatePackageJson = async () => {
          process.off('beforeExit', updatePackageJson);
          log.info(`updating ${pjson}`);
          await fs.writeFile(pjson, `${JSON.stringify(pj, null, 2)}\n`);
        };
        updatesTodo.push(updatePackageJson);
        removesTodo.push(async () => {
          process.on('beforeExit', updatePackageJson);
          // Remove the old packages.
          const removePkgs = [...obsolete.keys()];
          if (!removePkgs.length) {
            // No packages to remove.
            return;
          }
          const yarnRemove = await pspawn(
            'yarn',
            [
              ...linkFlags,
              'remove',
              '--ignore-workspace-root-check', // This may be a root dependency.
              '--mutex=network', // Don't race with other removals.
              '--ignore-scripts', // We install later, so no need to run scripts.
              ...removePkgs,
            ],
            { stdio: 'inherit', cwd: subdir },
          );
          if (yarnRemove) {
            throw Error(`yarn remove obsolete packages failed in ${subdir}`);
          }
        });
      }),
    );

    // Ensure we do all the updates after the removes, whether there were
    // failures or not.
    await Promise.allSettled(removesTodo.map(async remove => remove()))
      .then(results => {
        // After all have settled, try throwing the first rejection.
        const firstFailure = results.find(
          ({ status }) => status !== 'fulfilled',
        );
        if (firstFailure) {
          throw firstFailure.reason;
        }
      })
      .finally(() =>
        Promise.allSettled(updatesTodo.map(async update => update())),
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

  // Try to install via Yarn.
  const yarnInstallUi = await (subdirs.includes('ui') &&
    pspawn('yarn', [...linkFlags, 'install'], {
      stdio: 'inherit',
      cwd: 'ui',
    }));
  if (yarnInstallUi) {
    log.error('Cannot yarn install in ui directory');
    return 1;
  }

  if (sdkWorktree) {
    return 0;
  }

  if (opts.sdk) {
    await Promise.all(
      dirPackages.map(async ([dir, pjName]) => {
        const SUBOPTIMAL = false;
        if (SUBOPTIMAL) {
          // This use of yarn is noisy and slow.
          await pspawn('yarn', [...linkFlags, 'unlink', pjName]);
          return pspawn('yarn', [...linkFlags, 'link'], {
            stdio: 'inherit',
            cwd: dir,
          });
        }

        // This open-coding of the above yarn command is quiet and fast.
        const linkName = `${linkFolder}/${pjName}`;
        const linkDir = path.dirname(linkName);
        log('linking', linkName);
        return fs
          .mkdir(linkDir, { recursive: true })
          .then(_ => fs.symlink(path.relative(linkDir, dir), linkName));
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

  const sdkPackages = [...packages.values()].sort();
  for (const subdir of subdirs) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await fs.stat(`${subdir}/package.json`).catch(_ => false);
    if (
      exists &&
      // eslint-disable-next-line no-await-in-loop
      (await pspawn('yarn', [...linkFlags, 'link', ...sdkPackages], {
        stdio: 'inherit',
        cwd: subdir,
      }))
    ) {
      log.error('Cannot yarn link', ...sdkPackages);
      return 1;
    }
  }

  log.info(chalk.bold.green('Done installing'));
  return 0;
}
