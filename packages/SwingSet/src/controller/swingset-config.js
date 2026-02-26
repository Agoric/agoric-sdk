/* eslint-env node */

import { b, Fail } from '@endo/errors';

/**
 * @import {BundleFormat} from '../types-external.js';
 * @import {SwingSetConfig} from '../types-external.js';
 * @import {SwingSetConfigDescriptor} from '../types-external.js';
 * @import {SwingSetConfigProperties} from '../types-external.js';
 */

/**
 * @typedef {{
 *   readdirSync: (path: string, options: { withFileTypes: true }) => Array<{ name: string, isFile: () => boolean }>,
 *   statSync: (path: string) => unknown,
 *   existsSync: (path: string) => boolean,
 *   readFileSync: (path: string, encoding: string) => string,
 *   pathResolve: (...paths: string[]) => string,
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
    statSync,
    existsSync,
    readFileSync,
    pathResolve,
    cwd,
    importMetaResolve,
    consoleError = (...args) => console.error(...args),
  } = powers;

  /**
   * Scan a directory for files defining the vats to bootstrap for a swingset.
   *
   * @param {string} basedir
   * @param {object} [options]
   * @param {boolean} [options.includeDevDependencies]
   * @param {BundleFormat} [options.bundleFormat]
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
    /** @type {string | void} */
    let bootstrapPath = pathResolve(basedir, 'bootstrap.js');
    try {
      statSync(bootstrapPath);
    } catch {
      bootstrapPath = undefined;
    }
    const config = { vats, includeDevDependencies, format: bundleFormat };
    if (bootstrapPath) {
      vats.bootstrap = {
        sourceSpec: bootstrapPath,
        parameters: {},
      };
      config.bootstrap = 'bootstrap';
    }
    return config;
  };

  /**
   * @param {string} referrer
   * @param {string} specPath
   * @returns {Promise<string>}
   */
  const resolveSpecFromConfig = async (referrer, specPath) => {
    await null;
    try {
      return new URL(await importMetaResolve(specPath, referrer)).pathname;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ERR_MODULE_NOT_FOUND') {
        throw e;
      }
    }
    return new URL(specPath, referrer).pathname;
  };

  /**
   * @param {SwingSetConfig} config
   * @param {'vats' | 'bundles' | 'devices'} groupName
   * @param {string | undefined} configPath
   * @param {string} referrer
   * @param {(entry: SwingSetConfigProperties, name?: string) => void} [fixupEntry]
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
    const base = `file://${cwd()}/`;
    const referrer = configPath
      ? new URL(configPath, base).href
      : new URL(base).href;
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
