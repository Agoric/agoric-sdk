// @ts-check
/* eslint-env node */
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/captp';

import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * @import {ModuleFormat} from '@endo/bundle-source';
 * @import {BundleOptions} from '@endo/bundle-source';
 * @import {BundleSourceResult} from '@endo/bundle-source';
 */

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const PATH_SEP_RE = new RegExp(`${path.sep.replace(/\\/g, '\\\\')}`, 'g');

/**
 * @returns {Map<string, string>}
 */
const getWorkspacePackageDirs = (() => {
  /** @type {Map<string, string> | undefined} */
  let cache;
  return () => {
    if (cache) {
      return cache;
    }
    /** @type {Map<string, string>} */
    const packageDirs = new Map();
    const rootPkgPath = path.join(repoRoot, 'package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    const workspaces = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : [];
    for (const pattern of workspaces) {
      if (typeof pattern !== 'string') {
        continue;
      }
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        const parentDir = path.join(repoRoot, prefix);
        if (!fs.existsSync(parentDir)) {
          continue;
        }
        for (const dirent of fs.readdirSync(parentDir, { withFileTypes: true })) {
          if (!dirent.isDirectory()) {
            continue;
          }
          const pkgDir = path.join(parentDir, dirent.name);
          const pkgPath = path.join(pkgDir, 'package.json');
          if (!fs.existsSync(pkgPath)) {
            continue;
          }
          const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (typeof pkgJson.name === 'string') {
            packageDirs.set(pkgJson.name, pkgDir);
          }
        }
      } else {
        const pkgDir = path.join(repoRoot, pattern);
        const pkgPath = path.join(pkgDir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
          continue;
        }
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (typeof pkgJson.name === 'string') {
          packageDirs.set(pkgJson.name, pkgDir);
        }
      }
    }
    cache = packageDirs;
    return packageDirs;
  };
})();

/**
 * @param {string} sourceSpec
 * @returns {string | undefined}
 */
const resolveWorkspaceModule = sourceSpec => {
  if (sourceSpec.startsWith('.') || sourceSpec.startsWith('/')) {
    return undefined;
  }
  const parts = sourceSpec.split('/');
  const packageName =
    sourceSpec.startsWith('@') && parts.length > 1
      ? `${parts[0]}/${parts[1]}`
      : parts[0];
  const subpath = sourceSpec.startsWith('@')
    ? parts.slice(2).join('/')
    : parts.slice(1).join('/');
  const pkgDir = getWorkspacePackageDirs().get(packageName);
  if (!pkgDir || !subpath) {
    return undefined;
  }
  const candidate = path.join(pkgDir, subpath);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  for (const ext of ['.js', '.mjs', '.cjs', '.json']) {
    const candidateWithExt = `${candidate}${ext}`;
    if (fs.existsSync(candidateWithExt)) {
      return candidateWithExt;
    }
  }
  return undefined;
};

export const makeLookup =
  bootP =>
  /**
   * Recursively look up names in the context of the bootstrap
   * promise, such as:
   *
   * ['agoricNames', 'oracleBrand', 'USD']
   * ['namesByAddress']
   * ['namesByAddress', 'agoric1...']
   * ['namesByAddress', 'agoric1...', 'depositFacet']
   * ['wallet', 'issuer', 'IST']
   *
   * @param  {string[]} args
   * @returns {Promise<any>}
   */
  (...args) => {
    /** @type {string[]} */
    let namePath;
    if (args.length === 1 && Array.isArray(args[0])) {
      // Convert single array argument to a path.
      namePath = args[0];
    } else {
      namePath = args;
    }
    if (namePath.length === 0) {
      return bootP;
    }
    const [first, ...remaining] = namePath;

    // The first part of the name path is a property on bootP.
    const nextValue = E.get(bootP)[first];
    if (remaining.length === 0) {
      return nextValue;
    }

    // Any remaining paths go through the lookup method of the found
    // object.
    return E(nextValue).lookup(...remaining);
  };

/**
 * @param {string[]} scripts
 * @param {{ allowUnsafePlugins?: boolean, progname: string, rawArgs: string[], endowments?: Record<string, any> }} opts
 * @param {{ fs: import('fs/promises'), console: Console }} powers
 */
export const makeScriptLoader =
  (
    scripts,
    { allowUnsafePlugins, progname, rawArgs, endowments },
    { fs, console },
  ) =>
  async ({ home: bootP }) => {
    const pluginManager = await E.get(E.get(bootP).local).plugin.catch(_ => {});
    const pluginDir = await E(pluginManager)
      .getPluginDir()
      .catch(_ => {});

    if (allowUnsafePlugins && !pluginDir) {
      throw Error(`Installing unsafe plugins disabled; no pluginDir detected`);
    }

    for await (const script of scripts) {
      const moduleFile = path.resolve(process.cwd(), script);
      const pathResolve = (...paths) => {
        const fileName = /** @type {string} */ (paths.pop());
        try {
          return require.resolve(fileName, {
            paths: [
              path.resolve(path.dirname(moduleFile), ...paths),
              path.dirname(moduleFile),
              process.cwd(),
            ],
          });
        } catch (e) {
          const workspaceModule = resolveWorkspaceModule(fileName);
          if (workspaceModule) {
            return workspaceModule;
          }
          const isBareSpecifier =
            !fileName.startsWith('.') &&
            !fileName.startsWith('/') &&
            !path.isAbsolute(fileName);
          if (!isBareSpecifier || paths.length > 0) {
            return path.resolve(path.dirname(moduleFile), ...paths, fileName);
          }
          throw e;
        }
      };
      console.warn('running', moduleFile);

      let installUnsafePlugin;
      if (!allowUnsafePlugins) {
        installUnsafePlugin = async (plugin, _opts = undefined) => {
          throw Error(
            `Installing unsafe plugin ${JSON.stringify(
              pathResolve(plugin),
            )} disabled; maybe you meant '--allow-unsafe-plugins'?`,
          );
        };
      } else {
        installUnsafePlugin = (plugin, pluginOpts = undefined) => {
          const tryInstallUnsafePlugin = async () => {
            const absPath = pathResolve(plugin);
            const pluginName = absPath.replace(PATH_SEP_RE, '_');
            const pluginFile = path.resolve(pluginDir, pluginName);

            // Just create a little redirector for that path.
            console.warn(`Installing unsafe plugin ${JSON.stringify(absPath)}`);
            const content = `\
// ${pluginFile}
// AUTOMATICALLY GENERATED BY ${JSON.stringify(
              [progname, ...rawArgs].join(' '),
            )}
export { bootPlugin } from ${JSON.stringify(absPath)};
`;
            await fs.writeFile(pluginFile, content);

            // Return the bootstrap object for this plugin.
            console.info(`Loading plugin ${JSON.stringify(pluginFile)}`);
            return E.get(E(pluginManager).load(pluginName, pluginOpts))
              .pluginRoot;
          };
          return tryInstallUnsafePlugin().catch(e => {
            throw Error(`Cannot install unsafe plugin: ${(e && e.stack) || e}`);
          });
        };
      }

      // Use a dynamic import to load the deploy script.
      // It is unconfined.

      const modulePath = pathResolve(moduleFile);
      const mainNS = await import(modulePath);

      const allEndowments = harden({
        home: bootP,
        /**
         * @template {ModuleFormat} ModuleFormat
         * @param {string} file
         * @param {BundleOptions<ModuleFormat>} options
         * @returns {Promise<BundleSourceResult<ModuleFormat>>}
         */
        bundleSource: (file, options = {}) =>
          bundleSource(pathResolve(file), {
            elideComments: true,
            ...options,
          }),
        ...endowments,
        pathResolve,
        installUnsafePlugin,
        lookup: makeLookup(bootP),
      });

      const main = mainNS.main;
      if (typeof main === 'function') {
        await main(allEndowments);
        continue;
      }

      const defaultMain = mainNS.default;
      if (typeof defaultMain !== 'function') {
        console.error(
          `${moduleFile} does not have an "export main" nor "export default" function`,
        );
        continue;
      }

      // Backward-compatibility: if the module doesn't export 'main', then
      // assume it has a default export using the old 'deploy' API.
      await defaultMain(allEndowments.home, allEndowments);
    }
  };
