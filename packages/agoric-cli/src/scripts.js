// @ts-check
/* global process */
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/captp';
import { search as readContainingPackageDescriptor } from '@endo/compartment-mapper';

import createEsmRequire from 'esm';
import { createRequire } from 'module';
import path from 'path';
import url from 'url';

const require = createRequire(import.meta.url);
const esmRequire = createEsmRequire(/** @type {NodeModule} */ ({}));

const PATH_SEP_RE = new RegExp(`${path.sep.replace(/\\/g, '\\\\')}`, 'g');

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
 * @param {{ allowUnsafePlugins: boolean, progname: string, rawArgs: string[], endowments?: Record<string, any> }} opts
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
        const fileName = paths.pop();
        try {
          return require.resolve(fileName, {
            paths: [
              path.resolve(path.dirname(moduleFile), ...paths),
              path.dirname(moduleFile),
            ],
          });
        } catch (e) {
          return path.resolve(path.dirname(moduleFile), ...paths, fileName);
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

      // Use Node.js ESM support if package.json of template says "type":
      // "module".
      const read = async location => fs.readFile(url.fileURLToPath(location));
      const { packageDescriptorText } = await readContainingPackageDescriptor(
        read,
        url.pathToFileURL(moduleFile).href,
      ).catch(cause => {
        throw Error(
          `Expected a package.json beside deploy script ${moduleFile}, ${cause}`,
          { cause },
        );
      });
      const packageDescriptor = JSON.parse(packageDescriptorText);
      const nativeEsm = packageDescriptor.type === 'module';
      console.log(
        `Deploy script will run with ${
          nativeEsm ? 'Node.js ESM' : 'standardthings/esm emulation'
        }`,
      );

      const modulePath = pathResolve(moduleFile);
      let mainNS = await (nativeEsm && import(modulePath));
      if (!mainNS) {
        mainNS = esmRequire(modulePath);
      }

      const allEndowments = harden({
        home: bootP,
        bundleSource: (file, options = undefined) =>
          bundleSource(pathResolve(file), options),
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
