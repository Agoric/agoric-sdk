/* global process AggregateError Buffer */
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
  const workTrees = ['.'];
  let sdkWorktree;
  const versions = new Map();
  const linkFolder = path.resolve(`_agstate/yarn-links`);
  const linkFlags = [];
  if (opts.sdk) {
    linkFlags.push(`--link-folder=${linkFolder}`);
  }

  const yarnInstallEachWorktree = async (phase, ...flags) => {
    for (const workTree of workTrees) {
      log.info(`yarn install ${phase} in ${workTree}`);
      // eslint-disable-next-line no-await-in-loop
      const yarnInstall = await pspawn(
        'yarn',
        [...linkFlags, 'install', ...flags],
        {
          stdio: 'inherit',
          cwd: workTree,
        },
      );
      if (yarnInstall) {
        throw Error(`yarn install ${phase} failed in ${workTree}`);
      }
    }
  };

  const updateSdkVersion = async forceVersion => {
    // Prune the old version (removing potentially stale on-disk and yarn.lock
    // packages), and update on-disk and yarn.lock packages to the new version.
    // This is the most efficient way to fetch `forceVersion` fresh from the NPM
    // registry, in case it has changed (dist-tags are wont to point to
    // different packages over time).
    const addPackagesTodo = [];
    const prunePackagesTodo = [];

    await Promise.all(
      subdirs.map(async subdir => {
        // Prune, then update all the SDK package versions.
        const pjson = `${subdir}/package.json`;
        const packageJSON = await fs
          .readFile(pjson, 'utf-8')
          .catch(_ => undefined);
        if (!packageJSON) {
          return;
        }
        const updatedPackageDescriptor = JSON.parse(packageJSON);
        const prunedPackageDescriptor = { ...updatedPackageDescriptor };
        let needsPruning = false;
        for (const depSection of ['dependencies', 'devDependencies']) {
          const updatedDeps = updatedPackageDescriptor[depSection];
          if (updatedDeps) {
            const prunedDeps = { ...updatedDeps };
            prunedPackageDescriptor[depSection] = prunedDeps;
            for (const pkg of Object.keys(updatedDeps)) {
              if (versions.has(pkg)) {
                if (updatedDeps[pkg] === forceVersion) {
                  // We need to remove the old package and `yarn install` to
                  // prune the old dependencies both from disk and also the
                  // `yarn.lock`.  Only after that can we write the new deps and
                  // run `yarn install` again to update disk and `yarn.lock`.
                  delete prunedDeps[pkg];
                  needsPruning = true;
                }
                updatedDeps[pkg] = forceVersion;
              }
            }
          }
        }
        // Ensure we update the package.json before exiting.
        const updatePackageJson = async () => {
          // Don't update on exit anymore.
          // eslint-disable-next-line no-use-before-define
          process.off('beforeExit', updatePackageJsonOnExit);
          log.info(`updating ${pjson}`);
          await fs.writeFile(
            pjson,
            `${JSON.stringify(updatedPackageDescriptor, null, 2)}\n`,
          );
        };
        const updatePackageJsonOnExit = () => {
          // Prevent unhandled rejections.
          updatePackageJson().catch(e =>
            log.error(`Cannot update ${pjson}:`, e),
          );
        };
        addPackagesTodo.push(updatePackageJson);
        if (needsPruning) {
          prunePackagesTodo.push(async () => {
            // Update on exit, in case we are interrupted.
            process.on('beforeExit', updatePackageJsonOnExit);
            // Remove the old packages.
            log.info(`pruning ${pjson}`);
            await fs.writeFile(
              pjson,
              `${JSON.stringify(prunedPackageDescriptor, null, 2)}\n`,
            );
          });
        }
      }),
    );

    let prunedP;
    if (prunePackagesTodo.length) {
      // Run all the package+yarn.lock removal tasks in parallel.
      prunedP = Promise.allSettled(
        prunePackagesTodo.map(async prune => prune()),
      )
        .then(results => {
          // After all have settled, throw any errors.
          const failures = results.filter(
            ({ status }) => status !== 'fulfilled',
          );
          if (failures.length) {
            if (typeof AggregateError !== 'function') {
              throw failures[0].reason;
            }
            throw AggregateError(
              failures.map(({ reason }) => reason),
              'Failed to prune',
            );
          }
        })
        .then(async () =>
          yarnInstallEachWorktree('pruning', '--ignore-scripts'),
        );
    } else {
      // Nothing to prune, so just skip this step.
      prunedP = Promise.resolve();
    }

    // Ensure we do all the package.json+yarn.lock additions after any necessary
    // pruning, even if there are failures.
    await prunedP.finally(() =>
      // Ensure the package.jsons are installed with the fresh version information.
      Promise.allSettled(addPackagesTodo.map(async update => update())),
    );
  };

  const dappPackageJSON = await fs
    .readFile(`package.json`, 'utf-8')
    .then(data => JSON.parse(data))
    .catch(err => {
      log('error reading', `package.json`, err);
      throw err;
    });
  if (dappPackageJSON.useWorkspaces) {
    const workdirs = await workspaceDirectories();
    sdkWorktree = workdirs.find(subd => subd === 'agoric-sdk');
    subdirs = ['.', ...workdirs.filter(subd => subd !== 'agoric-sdk')];

    // Add 'ui' directory by default, if it exists.
    if (!subdirs.find(subd => subd === 'ui')) {
      if (await fs.stat(`ui/package.json`).catch(_ => false)) {
        subdirs.push('ui');
        workTrees.push('ui');
      }
    }
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

  /** @type {Map<string, string>} */
  const packages = new Map();

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
      packages.set(dir, pj.name);
      versions.set(pj.name, pj.version);
    }),
  );

  if (opts.sdk) {
    // We remove all the links to prevent `yarn install` below from corrupting
    // them.
    log('removing', linkFolder);
    await rimraf(linkFolder);

    // Link the SDK.
    if (sdkWorktree) {
      await fs.unlink(sdkWorktree).catch(_ => {});
      await fs.symlink(sdkRoot, sdkWorktree);
    }

    await Promise.all(
      subdirs.map(async subdir => {
        const nm = `${subdir}/node_modules`;
        log(chalk.bold.green(`removing ${nm} link`));
        await fs.unlink(nm).catch(_ => {});

        // Remove all the package links.
        // This is needed to prevent yarn errors when installing new versions of
        // linked modules (like `@agoric/zoe`).
        await Promise.all(
          [...packages.values()].map(async pjName =>
            fs.unlink(`${nm}/${pjName}`).catch(_ => {}),
          ),
        );
      }),
    );
  }

  if (forceSdkVersion !== undefined) {
    // We need to update the SDK version in the package.jsons and `yarn.lock`.
    await updateSdkVersion(forceSdkVersion);
  }

  await yarnInstallEachWorktree('updates');

  if (sdkWorktree || !opts.sdk) {
    log.info(chalk.bold.green('Done installing without SDK links'));
    return 0;
  }

  // Create symlinks to the SDK packages.
  await Promise.all(
    [...packages.entries()].map(async ([dir, pjName]) => {
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

  log.info(chalk.bold.green('Done installing with SDK links'));
  return 0;
}
