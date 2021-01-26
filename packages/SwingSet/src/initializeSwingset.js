import fs from 'fs';
import path from 'path';

import { assert } from '@agoric/assert';
import bundleSource from '@agoric/bundle-source';
import { initSwingStore } from '@agoric/swing-store-simple';

import { insistStorageAPI } from './storageAPI';
import { initializeKernel } from './kernel/initializeKernel';

const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
const { keys, values, fromEntries } = Object;
const allValues = async obj =>
  fromEntries(zip(keys(obj), await Promise.all(values(obj))));

/**
 * Build the source bundles for the kernel and xsnap vat worker.
 */
export async function buildKernelBundles() {
  // this takes 2.7s on my computer

  const src = rel => bundleSource(require.resolve(rel));
  const srcGE = rel => bundleSource(require.resolve(rel), 'getExport');

  const bundles = await allValues({
    kernel: src('./kernel/kernel.js'),
    adminDevice: src('./kernel/vatAdmin/vatAdmin-src'),
    adminVat: src('./kernel/vatAdmin/vatAdminWrapper'),
    comms: src('./vats/comms'),
    vattp: src('./vats/vat-tp'),
    timer: src('./vats/vat-timerWrapper'),

    lockdown: srcGE('./kernel/vatManager/lockdown-subprocess-xsnap.js'),
    supervisor: srcGE('./kernel/vatManager/supervisor-subprocess-xsnap.js'),
  });

  return harden(bundles);
}

function byName(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}
/**
 * @typedef {Object} SwingSetConfigProperties
 * @property {string} [sourceSpec] path to the source code
 * @property {string} [bundleSpec]
 * @property {Record<string, any>} [parameters]
 */

/**
 * @typedef {Record<string, SwingSetConfigProperties>} SwingSetConfigDescriptor
 * Where the property name is the name of the vat.  Note that
 * the `bootstrap` property names the vat that should be used as the bootstrap vat.  Although a swingset
 * configuration can designate any vat as its bootstrap vat, `loadBasedir` will always look for a file named
 * 'bootstrap.js' and use that (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 */

/**
 * @typedef {Object} SwingSetConfig a swingset config object
 * @property {string} bootstrap
 * @property {SwingSetConfigDescriptor} [vats]
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {*} [devices]
 *
 * Swingsets defined by scanning a directory in this manner define no devices.
 */

/**
 * Scan a directory for files defining the vats to bootstrap for a swingset, and
 * produce a swingset config object for what was found there.  Looks for files
 * with names of the pattern `vat-NAME.js` as well as a file named
 * 'bootstrap.js'.
 *
 * @param {string} basedir  The directory to scan
 *
 * @returns {SwingSetConfig} a swingset config object: {
 *   bootstrap: "bootstrap",
 *   vats: {
 *     NAME: {
 *       sourceSpec: PATHSTRING
 *     }
 *   }
 * }
 *
 * Where NAME is the name of the vat; `sourceSpec` contains the path to the vat with that name.  Note that
 * the `bootstrap` property names the vat that should be used as the bootstrap vat.  Although a swingset
 * configuration can designate any vat as its bootstrap vat, `loadBasedir` will always look for a file named
 * 'bootstrap.js' and use that (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 *
 * Swingsets defined by scanning a directory in this manner define no devices.
 */
export function loadBasedir(basedir) {
  const vats = {};
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.sort(byName);
  subs.forEach(dirent => {
    if (dirent.name.endsWith('~')) {
      // Special case crap filter to ignore emacs backup files and the like.
      // Note that the regular filename parsing below will ignore such files
      // anyway, but this skips logging them so as to reduce log spam.
      return;
    }
    if (
      dirent.name.startsWith('vat-') &&
      dirent.isFile() &&
      dirent.name.endsWith('.js')
    ) {
      const name = dirent.name.slice('vat-'.length, -'.js'.length);
      const vatSourcePath = path.resolve(basedir, dirent.name);
      vats[name] = { sourceSpec: vatSourcePath, parameters: {} };
    }
  });
  let bootstrapPath = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapPath);
  } catch (e) {
    // TODO this will catch the case of the file not existing but doesn't check
    // that it's a plain file and not a directory or something else unreadable.
    // Consider putting in a more sophisticated check if this whole directory
    // scanning thing is something we decide we want to have long term.
    bootstrapPath = undefined;
  }
  const config = { vats };
  if (bootstrapPath) {
    vats.bootstrap = {
      sourceSpec: bootstrapPath,
      parameters: {},
    };
    config.bootstrap = 'bootstrap';
  }
  return config;
}

/**
 * Resolve a pathname found in a config descriptor.  First try to resolve it as
 * a module path, and then if that doesn't work try to resolve it as an
 * ordinary path relative to the directory in which the config file was found.
 *
 * @param {string} dirname  Path to directory containing the config file
 * @param {string} specPath  Path found in a `sourceSpec` or `bundleSpec` property
 *
 * @returns {string} the absolute path corresponding to `specPath` if it can be
 *    determined.
 */
function resolveSpecFromConfig(dirname, specPath) {
  try {
    return require.resolve(specPath, { path: [dirname] });
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  return path.resolve(dirname, specPath);
}

/**
 * For each entry in a config descriptor (i.e, `vats`, `bundles`, etc), convert
 * it to normal form: resolve each pathname to a context-insensitive absolute
 * path and make sure it has a `parameters` property if it's supposed to.
 *
 * @param {SwingSetConfigDescriptor} desc  The config descriptor to be normalized.
 * @param {string} dirname  The pathname of the directory in which the config file was found
 * @param {boolean} expectParameters `true` if the entries should have parameters (for
 *    example, `true` for `vats` but `false` for bundles).
 */
function normalizeConfigDescriptor(desc, dirname, expectParameters) {
  if (desc) {
    for (const name of Object.keys(desc)) {
      const entry = desc[name];
      if (entry.sourceSpec) {
        entry.sourceSpec = resolveSpecFromConfig(dirname, entry.sourceSpec);
      }
      if (entry.bundleSpec) {
        entry.bundleSpec = resolveSpecFromConfig(dirname, entry.bundleSpec);
      }
      if (expectParameters && !entry.parameters) {
        entry.parameters = {};
      }
    }
  }
}

/**
 * Read and parse a swingset config file and return it in normalized form.
 *
 * @param {string} configPath  Path to the config file to be processed
 *
 * @returns {SwingSetConfig} the contained config object, in normalized form, or null if the
 *    requested config file did not exist.
 *
 * @throws {Error} if the file existed but was inaccessible, malformed, or otherwise
 *    invalid.
 */
export function loadSwingsetConfigFile(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    const dirname = path.dirname(configPath);
    normalizeConfigDescriptor(config.vats, dirname, true);
    normalizeConfigDescriptor(config.bundles, dirname, false);
    // normalizeConfigDescriptor(config.devices, dirname, true); // TODO: represent devices
    if (!config.bootstrap) {
      throw Error(`no designated bootstrap vat in ${configPath}`);
    } else if (!config.vats[config.bootstrap]) {
      throw Error(
        `bootstrap vat ${config.bootstrap} not found in ${configPath}`,
      );
    }
    return config;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    } else {
      throw e;
    }
  }
}

export function swingsetIsInitialized(storage) {
  return !!storage.get('initialized');
}

export async function initializeSwingset(
  config,
  argv = [],
  hostStorage = initSwingStore().storage,
  initializationOptions = {},
) {
  insistStorageAPI(hostStorage);

  if (swingsetIsInitialized(hostStorage)) {
    throw Error(`kernel store already initialized`);
  }

  // copy config so we can safely mess with it even if it's shared or hardened
  config = JSON.parse(JSON.stringify(config));
  if (!config.bundles) {
    config.bundles = {};
  }
  if (!config.vats) {
    config.vats = {};
  }
  if (!config.devices) {
    config.devices = {};
  }

  const { kernelBundles = await buildKernelBundles() } = initializationOptions;

  hostStorage.set('kernelBundle', JSON.stringify(kernelBundles.kernel));
  hostStorage.set('lockdownBundle', JSON.stringify(kernelBundles.lockdown));
  hostStorage.set('supervisorBundle', JSON.stringify(kernelBundles.supervisor));

  if (config.bootstrap && argv) {
    if (config.vats[config.bootstrap]) {
      if (!config.vats[config.bootstrap].parameters) {
        config.vats[config.bootstrap].parameters = {};
      }
      config.vats[config.bootstrap].parameters.argv = argv;
    }
  }

  // the vatAdminDevice is given endowments by the kernel itself
  config.vats.vatAdmin = {
    bundle: kernelBundles.adminVat,
  };
  config.devices.vatAdmin = {
    bundle: kernelBundles.adminDevice,
  };

  // comms vat is added automatically, but TODO: bootstraps must still
  // connect it to vat-tp. TODO: test-message-patterns builds two comms and
  // two vattps, must handle somehow.
  config.vats.comms = {
    bundle: kernelBundles.comms,
    creationOptions: {
      enablePipelining: true,
      enableSetup: true,
      managerType: 'local',
    },
  };

  // vat-tp is added automatically, but TODO: bootstraps must still connect
  // it to comms
  config.vats.vattp = {
    bundle: kernelBundles.vattp,
  };

  // timer wrapper vat is added automatically, but TODO: bootstraps must
  // still provide a timer device, and connect it to the wrapper vat
  config.vats.timer = {
    bundle: kernelBundles.timer,
  };

  function validateBundleDescriptor(desc, groupName, descName) {
    if (desc.bundleHash) {
      throw Error(
        `config ${groupName}.${descName}: "bundleHash" is not yet supported for specifying bundles`,
      );
    }
    let count = 0;
    if (desc.bundleName) {
      if (groupName === 'bundles') {
        throw Error(
          `config bundles.${descName}: "bundleName" is only available in vat or device descriptors`,
        );
      } else if (!config.bundles[desc.bundleName]) {
        throw Error(
          `config ${groupName}.${descName}: bundle ${desc.bundleName} is undefined`,
        );
      }
      count += 1;
    }
    if (desc.sourceSpec) {
      count += 1;
    }
    if (desc.bundleSpec) {
      count += 1;
    }
    if (desc.bundle) {
      count += 1;
    }
    if (count > 1) {
      throw Error(
        `config ${groupName}.${descName}: "bundleName", "bundle", "bundleSpec", and "sourceSpec" are mutually exclusive`,
      );
    } else if (count === 0) {
      throw Error(
        `config ${groupName}.${descName}: you must specify one of: "bundleName", "bundle", "bundleSpec", or "sourceSpec"`,
      );
    }
  }

  async function bundleBundles(group, groupName) {
    if (group) {
      const names = [];
      const presumptiveBundles = [];
      for (const name of Object.keys(group)) {
        const desc = group[name];
        validateBundleDescriptor(desc, groupName, name);
        if (desc.sourceSpec) {
          names.push(name);
          presumptiveBundles.push(bundleSource(desc.sourceSpec));
        } else if (desc.bundleSpec) {
          names.push(name);
          presumptiveBundles.push(fs.readFileSync(desc.bundleSpec));
        } else if (!desc.bundle && !desc.bundleName) {
          assert.fail(`this can't happen`);
        }
      }
      const actualBundles = await Promise.all(presumptiveBundles);
      for (let i = 0; i < names.length; i += 1) {
        group[names[i]].bundle = actualBundles[i];
      }
    }
  }

  await bundleBundles(config.bundles, 'bundles');
  await bundleBundles(config.vats, 'vats');
  await bundleBundles(config.devices, 'devices');

  return initializeKernel(config, hostStorage);
}
