/* eslint-env node */

import { b, Fail } from '@endo/errors';
import url from 'node:url';

/**
 * @import * as nodePath from 'node:path';
 * @import {SwingSetConfig} from '../types-external.js';
 * @import {SwingSetConfigDescriptor} from '../types-external.js';
 * @import {SwingSetConfigProperties} from '../types-external.js';
 */

/**
 * @typedef {{
 *   readdirSync: (path: string, options: { withFileTypes: true }) => Array<{ name: string, isFile: () => boolean }>,
 *   existsSync: (path: string) => boolean,
 *   readFileSync: (path: string, encoding: 'utf-8') => string,
 *   pathResolve: typeof nodePath.resolve,
 *   cwd: () => string,
 *   importMetaResolve: (specifier: string, referrer: string) => Promise<string> | string,
 *   consoleError?: (...args: unknown[]) => void,
 * }} SwingsetConfigIOPowers
 */

/**
 * @param {SwingsetConfigIOPowers} powers
 */
export const makeSwingsetConfigIO = powers => {
  const {
    readdirSync,
    existsSync,
    readFileSync,
    pathResolve,
    cwd,
    importMetaResolve,
    consoleError = (...args) => console.error(...args),
  } = powers;

  /**
   * Scan a directory for `vat-${name}.js` files defining the vats to bootstrap
   * for a swingset, as well as a file named "bootstrap.js" which if present
   * will be associated with name "bootstrap" and identified as `bootstrap` in
   * the resulting SwingSetConfig.
   * Each vat record will include `sourceSpec` and have empty `parameters`, and
   * there will be no devices.
   *
   * @param {string} basedir
   * @param {Pick<SwingSetConfig, 'includeDevDependencies' | 'bundleFormat'>} [options]
   *   copied into the return value
   * @returns {SwingSetConfig}
   */
  const loadBasedir = (basedir, options = {}) => {
    const { includeDevDependencies = false, bundleFormat = undefined } =
      options;
    /** @type { SwingSetConfigDescriptor } */
    const vats = {};
    const rVatName = /^vat-(.*)\.js$/s;
    const files = readdirSync(basedir, { withFileTypes: true });
    const vatFiles = files.flatMap(dirent => {
      const file = dirent.name;
      const m = rVatName.exec(file);
      return m && dirent.isFile() ? [{ file, label: m[1] }] : [];
    });
    vatFiles.sort((a, b2) =>
      a.label < b2.label ? -1 : a.label > b2.label ? 1 : 0,
    );
    for (const { file, label } of vatFiles) {
      const vatSourcePath = pathResolve(basedir, file);
      vats[label] = { sourceSpec: vatSourcePath, parameters: {} };
    }
    const config = { vats, includeDevDependencies, bundleFormat };
    // If the directory contains a bootstrap.js, try to use it (and fail later
    // if it's unreadable/a directory/etc.).
    const bootstrapPath = pathResolve(basedir, 'bootstrap.js');
    if (existsSync(bootstrapPath)) {
      vats.bootstrap = {
        sourceSpec: bootstrapPath,
        parameters: {},
      };
      config.bootstrap = 'bootstrap';
    }
    return config;
  };

  /**
   * Resolve a module specifier to an absolute path in a particular context,
   * falling back on simple directory path operations if necessary.
   *
   * @param {string} referrer URL
   * @param {string} specPath
   * @returns {Promise<string>}
   */
  const resolveSpecFromConfig = async (referrer, specPath) => {
    await null;
    try {
      return url.fileURLToPath(await importMetaResolve(specPath, referrer));
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ERR_MODULE_NOT_FOUND') {
        throw e;
      }
    }
    return url.fileURLToPath(new URL(specPath, referrer));
  };

  /**
   * Convert each entry in a config descriptor group (`vats`/`bundles`/etc.) to
   * normal form: resolve each pathname to a context-insensitive absolute path
   * and run any other appropriate fixup.
   *
   * @param {SwingSetConfig} config
   * @param {'vats' | 'bundles' | 'devices'} groupName
   * @param {string | undefined} configPath of the containing config file
   * @param {string} referrer URL
   * @param {(entry: SwingSetConfigProperties, name?: string) => void} [fixupEntry]
   *   A function to call on each entry to e.g. add defaults for missing fields
   *   such as vat `parameters`.
   */
  const normalizeConfigDescriptor = async (
    config,
    groupName,
    configPath,
    referrer,
    fixupEntry,
  ) => {
    const normalizeSpec = async (entry, specKey, name) => {
      const sourcePath = await resolveSpecFromConfig(referrer, entry[specKey]);
      existsSync(sourcePath) ||
        Fail`${sourcePath} for ${b(groupName)}[${name}].${b(specKey)} in ${configPath} config file does not exist`;
      entry[specKey] = sourcePath;
    };

    const jobs = [];
    const desc = config[groupName];
    if (desc) {
      for (const [name, entry] of Object.entries(desc)) {
        fixupEntry?.(entry, name);
        if ('sourceSpec' in entry) {
          jobs.push(normalizeSpec(entry, 'sourceSpec', name));
        }
        if ('bundleSpec' in entry) {
          jobs.push(normalizeSpec(entry, 'bundleSpec', name));
        }
      }
    }
    return Promise.all(jobs);
  };

  /**
   * @param {SwingSetConfig} config
   * @param {string} [configPath]
   * @returns {Promise<void>}
   */
  const normalizeConfig = async (config, configPath) => {
    const baseHref = `${url.pathToFileURL(cwd()).href}/`;
    const referrer = configPath ? new URL(configPath, baseHref).href : baseHref;
    const fixupVat = vat => (vat.parameters ||= {});
    await Promise.all([
      normalizeConfigDescriptor(config, 'vats', configPath, referrer, fixupVat),
      normalizeConfigDescriptor(config, 'bundles', configPath, referrer),
    ]);
    config.bootstrap ||
      Fail`no designated bootstrap vat in ${configPath} config file`;
    (config.vats && config.vats[/** @type {string} */ (config.bootstrap)]) ||
      Fail`bootstrap vat ${config.bootstrap} not found in ${configPath} config file`;
  };

  /**
   * Read and normalize a swingset config file, or return null if the file does
   * not exist.
   *
   * @param {string} configPath
   * @returns {Promise<SwingSetConfig | null>}
   */
  const loadSwingsetConfigFile = async configPath => {
    await null;
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      await normalizeConfig(config, configPath);
      return config;
    } catch (e) {
      consoleError(`failed to load ${configPath}`);
      if (e.code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  };

  return harden({
    loadBasedir,
    normalizeConfig,
    loadSwingsetConfigFile,
  });
};
