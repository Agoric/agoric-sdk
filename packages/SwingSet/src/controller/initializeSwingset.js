import { deepCopyJsonable, makeTracer } from '@agoric/internal';
import { mustMatch } from '@agoric/store';
import bundleSource from '@endo/bundle-source';
import { assert, Fail } from '@endo/errors';
import { kdebugEnable } from '../lib/kdebug.js';
import { insistStorageAPI } from '../lib/storageAPI.js';
import { ManagerType } from '../typeGuards.js';
import {
  makeWorkerBundleHandler,
  makeXsnapBundleData,
} from './bundle-handler.js';
import { initializeKernel } from './initializeKernel.js';

/**
 * @import {SwingSetConfig} from '../types-external.js';
 * @import {SwingSetKernelConfig} from '../types-external.js';
 * @import {SwingSetConfigProperties} from '../types-external.js';
 * @import {Bundle} from '../types-external.js';
 * @import {SwingStoreKernelStorage} from '../types-external.js';
 * @import {EndoZipBase64Bundle} from '../types-external.js';
 * @import {BundleHandler} from './bundle-handler.js';
 */
/**
 * @typedef {(path: string) => Promise<EndoZipBase64Bundle>} BundleFromPathPower
 */
/**
 * @typedef {(sourceSpec: string, options: {
 *   dev?: boolean,
 *   format?: string,
 *   byteLimit?: number,
 * }) => Promise<EndoZipBase64Bundle>} BundleFromSourceSpecPower
 */

const trace = makeTracer('IniSwi', false);

/**
 * @param {X[]} xs
 * @param {Y[]} ys
 * @returns {[X, Y][]}
 * @template X, Y
 */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
const { keys, values, fromEntries } = Object;
/**
 * @param {Record<string, Promise<V>>} obj
 * @returns {Promise<Record<string, V>>}
 * @template V
 */
const allValues = async obj => {
  const vs = await Promise.all(values(obj));
  return fromEntries(zip(keys(obj), vs));
};

const bundleRelative = rel =>
  bundleSource(new URL(rel, import.meta.url).pathname, {
    byteLimit: Infinity,
  });

/**
 * Build the source bundles for the kernel. makeSwingsetController()
 * calls this on each launch, to get the
 * current kernel sources
 */
export async function buildKernelBundle() {
  // this takes about 1.0s on my computer
  const kernelBundle = await bundleRelative('../kernel/kernel.js');
  return harden(kernelBundle);
}

/**
 * Build the source bundles for built-in vats and devices, and for the
 * xsnap vat worker.
 */
export async function buildVatAndDeviceBundles() {
  const bundles = await allValues({
    adminDevice: bundleRelative('../devices/vat-admin/device-vat-admin.js'),
    adminVat: bundleRelative('../vats/vat-admin/vat-vat-admin.js'),
    comms: bundleRelative('../vats/comms/index.js'),
    vattp: bundleRelative('../vats/vattp/vat-vattp.js'),
    timer: bundleRelative('../vats/timer/vat-timer.js'),
  });

  return harden(bundles);
}

// Unit tests can call this to amortize the bundling costs: pass the
// result to initializeSwingset's initializationOptions.kernelBundles
// (for the vat/device/worker bundles), and you can pass .kernelBundle
// individually to makeSwingsetController's
// runtimeOptions.kernelBundle

// Tests can also pass the whole result to buildVatController's
// runtimeOptions.kernelBundles, which will pass it through to both.

export async function buildKernelBundles() {
  trace('buildKernelBundles');
  const bp = buildVatAndDeviceBundles();
  const kp = buildKernelBundle();
  const [vdBundles, kernelBundle] = await Promise.all([bp, kp]);
  return harden({ kernel: kernelBundle, ...vdBundles });
}

export function swingsetIsInitialized(kernelStorage) {
  insistStorageAPI(kernelStorage.kvStore);
  return !!(
    kernelStorage.kvStore.get('version') ||
    kernelStorage.kvStore.get('initialized')
  );
}

/**
 * @param {Record<string, any>} obj
 * @param {(string|undefined)[]} [firsts]
 * @returns {Record<string, any>}
 */
function sortObjectProperties(obj, firsts = []) {
  const sorted = [...firsts, ...Object.keys(obj).sort()];
  const result = {};
  for (const prop of sorted) {
    if (prop && !Object.hasOwn(result, prop) && Object.hasOwn(obj, prop)) {
      result[prop] = obj[prop];
    }
  }
  return result;
}

/**
 * @typedef {{ kernelBundles?: Record<string, Bundle>, verbose?: boolean,
 *              addVatAdmin?: boolean, addComms?: boolean, addVattp?: boolean,
 *              addTimer?: boolean,
 *            }} InitializationOptions
 */
/**
 * @typedef {{
 *   env?: Record<string, string | undefined>,
 *   bundleFromPath?: BundleFromPathPower,
 *   bundleFromSourceSpec?: BundleFromSourceSpecPower,
 *   bundleHandler?: BundleHandler,
 *   verbose?: boolean,
 * }} InitializeSwingsetRuntimeOptions
 */

/**
 * Build the kernel-facing config object with deterministic bundle IDs.
 *
 * @param {SwingSetConfig} config
 * @param {unknown} bootstrapArgs
 * @param {InitializationOptions} initializationOptions
 * @param {InitializeSwingsetRuntimeOptions} runtimeOptions
 * @returns {Promise<SwingSetKernelConfig>}
 */
export async function buildSwingsetKernelConfig(
  config,
  bootstrapArgs,
  initializationOptions = {},
  runtimeOptions = {},
) {
  const { bundleFromPath, bundleFromSourceSpec } = runtimeOptions;

  // copy config so we can safely mess with it even if it's shared or hardened
  config = deepCopyJsonable(config);
  if (!config.bundles) {
    config.bundles = {};
  }
  if (!config.vats) {
    config.vats = {};
  }
  if (!config.devices) {
    config.devices = {};
  }

  // Use ambient process.env only if caller did not specify.
  const { env: { SWINGSET_WORKER_TYPE } = process.env } = runtimeOptions;

  // The worker/manager type used by each vat is controlled by a
  // hierarchy of settings.
  //
  // * config.vats.NAME.creationOptions.managerType (highest priority, but
  //                                                 only for static vats)
  // * config.defaultManagerType (applies to both static and dynamic vats)
  // * env.SWINGSET_WORKER_TYPE
  // * use a 'local' worker (lowest priority)
  //
  // The environment variable allows us to run a batch of unit tests
  // under a different worker (e.g. 'yarn test:xs'), without editing
  // all their config records individually. `config.defaultManagerType`
  // has a higher priority so that tests which require a specific
  // worker (e.g. which exercise XS heap snapshots, or metering) can
  // override the env var, so they won't break under `yarn test:xs`.

  if (!config.defaultManagerType) {
    config.defaultManagerType = /** @type {any} */ (
      SWINGSET_WORKER_TYPE || 'local'
    );
  }
  if (config.defaultManagerType === 'xs-worker') {
    // 'xs-worker' is an alias accepted for now
    config.defaultManagerType = 'xsnap'; // but 'xsnap' is preferred
  }
  mustMatch(config.defaultManagerType, ManagerType);

  const obtainKernelBundles = async () =>
    initializationOptions.kernelBundles || buildVatAndDeviceBundles();
  const kernelBundles = await obtainKernelBundles();
  const {
    addVatAdmin = true,
    addComms = true,
    addVattp = true,
    addTimer = true,
  } = initializationOptions;

  if (config.bootstrap && bootstrapArgs) {
    const bootConfig = config.vats[config.bootstrap];
    if (bootConfig) {
      if (!bootConfig.parameters) {
        bootConfig.parameters = {};
      }
      bootConfig.parameters.argv = bootstrapArgs;
    }
  }

  if (addVatAdmin) {
    // vatAdmin and bundle devices are given endowments by the kernel itself
    config.vats.vatAdmin = {
      bundle: kernelBundles.adminVat,
    };
    config.devices.vatAdmin = {
      bundle: kernelBundles.adminDevice,
    };
  }

  if (addComms) {
    // comms vat is added automatically, but TODO: bootstraps must still
    // connect it to vat-tp. TODO: test-message-patterns builds two comms and
    // two vattps, must handle somehow.
    config.vats.comms = {
      bundle: kernelBundles.comms,
      creationOptions: {
        enablePipelining: true,
        // The use of setup rather than buildRootObject requires
        // a local worker. We have no plans to support setup on
        // non-local workers any time soon.
        enableSetup: true,
        managerType: 'local',
        useTranscript: false,
        neverReap: true,
      },
    };
  }

  if (addVattp) {
    // vat-tp is added automatically, but TODO: bootstraps must still connect
    // it to comms
    config.vats.vattp = {
      bundle: kernelBundles.vattp,
    };
  }

  if (addTimer) {
    // timer wrapper vat is added automatically, but TODO: bootstraps must
    // still provide a timer device, and connect it to the wrapper vat
    config.vats.timer = {
      bundle: kernelBundles.timer,
    };
  }

  /**
   * The host application gives us
   * config.[vats|devices].NAME.[bundle|bundleSpec|sourceSpec|bundleName] .
   * The 'bundleName' option points into
   * config.bundles.BUNDLENAME.[bundle|bundleSpec|sourceSpec], which can
   * also include arbitrary named bundles that will be made available to
   * E(vatAdminService).getNamedBundleCap(bundleName), and temporarily as
   * E(vatAdminService).createVatByName(bundleName)
   *
   * The 'kconfig' we pass through to initializeKernel has
   * kconfig.[vats|devices].NAME.bundleID and
   * kconfig.namedBundleIDs.BUNDLENAME=bundleID, which both point into
   * kconfig.idToBundle.BUNDLEID=bundle
   *
   * @param {SwingSetConfigProperties} desc
   * @param {Record<string, *>} [nameToBundle]
   */
  async function getBundle(desc, nameToBundle) {
    trace(
      'getBundle',
      Object.keys(desc),
      desc.moduleFormat,
      desc.endoZipBase64Sha512 || desc.sourceSpec,
    );

    // shape validated by caller
    if ('bundle' in desc) {
      return desc.bundle;
    } else if ('bundleSpec' in desc) {
      if (!bundleFromPath) {
        throw Fail`runtimeOptions.bundleFromPath is required for bundleSpec`;
      }
      return bundleFromPath(desc.bundleSpec);
    } else if ('sourceSpec' in desc) {
      const options = {
        dev: config.includeDevDependencies,
        format: config.bundleFormat,
        // Disable bundle size limits for kernel-generated bundles which may be
        // large, but do not travel through RPC and we still want to be legible.
        byteLimit: Infinity,
      };
      return bundleFromSourceSpec
        ? bundleFromSourceSpec(desc.sourceSpec, options)
        : bundleSource(desc.sourceSpec, options);
    } else if ('bundleName' in desc) {
      if (!nameToBundle) {
        throw Fail`cannot use .bundleName in config.bundles`;
      }
      const bundle = nameToBundle[desc.bundleName];
      bundle || Fail`unknown bundleName ${desc.bundleName}`;
      return bundle;
    }
    throw Error(`unknown mode in desc`, desc);
  }

  /**
   * Returns a bundle record with an "id" property from an input that might be missing it.
   *
   * @param {EndoZipBase64Bundle & {id?: string}} bundle
   * @returns {Promise<EndoZipBase64Bundle & {id: string}>} bundle
   */
  async function addBundleID(bundle) {
    if ('id' in bundle) {
      // during config, we believe bundle.id, but not at runtime!
      // @ts-expect-error cast
      return bundle;
    }
    const { endoZipBase64Sha512 } = bundle;
    assert.typeof(endoZipBase64Sha512, 'string');
    return {
      ...bundle,
      id: `b1-${endoZipBase64Sha512}`,
    };
  }

  /**
   *
   * @param {SwingSetConfigProperties & {bundleID?: string}} desc
   * @param {Record<string, EndoZipBase64Bundle>} [nameToBundle]
   */
  async function processDesc(desc, nameToBundle) {
    const allModes = /** @type {const} */ ([
      'bundle',
      'bundleSpec',
      'sourceSpec',
      'bundleName',
    ]);
    const modes = allModes.filter(mode => mode in desc);
    modes.length === 1 ||
      Fail`need =1 of bundle/bundleSpec/sourceSpec/bundleName, got ${modes}`;
    const mode = modes[0];

    // Remove the original mode in favor of a uniform "bundleID" property.
    const bundle = await getBundle(desc, nameToBundle);
    const bundleWithID = await addBundleID(bundle);
    delete desc[mode];
    desc.bundleID = bundleWithID.id;

    return bundleWithID;
  }

  /**
   * @param {string} groupName
   * @param {Record<string, EndoZipBase64Bundle>} [nameToBundle]
   */
  async function processGroup(groupName, nameToBundle) {
    const group = config[groupName] || {};
    const names = Object.keys(group).sort();
    const processP = names.map(name =>
      processDesc(group[name], nameToBundle).catch(err => {
        throw Error(`config.${groupName}.${name}: ${err.message}`);
      }),
    );
    const bundlesWithID = await Promise.all(processP);
    /** @type {Record<string, EndoZipBase64Bundle & { id: string }>} */
    const newNameToBundle = {};
    /** @type {Record<string, EndoZipBase64Bundle & { id: string }>} */
    const idToBundle = {};
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const bundle = bundlesWithID[i];
      const id = bundle.id;
      newNameToBundle[name] = bundle;
      idToBundle[id] = bundle;
    }
    return [newNameToBundle, idToBundle];
  }

  // for each config.bundles.NAME, do whatever bundling/reading is necessary
  // to get a bundle and bundleID, and return both the name->bundleID record
  // (to populate config.namedBundles) and the bundleID->bundle record (to
  // install the actual bundles)

  config.bundles = sortObjectProperties(config.bundles);
  config.vats = sortObjectProperties(config.vats, [
    config.bootstrap,
    'vatAdmin',
    'comms',
    'vattp',
    'timer',
  ]);
  config.devices = sortObjectProperties(config.devices);
  const [nameToBundle, idToNamedBundle] = await processGroup('bundles');
  const [_1, idToVatBundle] = await processGroup('vats', nameToBundle);
  const [_2, idToDeviceBundle] = await processGroup('devices', nameToBundle);
  /** @type { SwingSetKernelConfig } */
  const kconfig = {
    ...config,
    namedBundleIDs: {},
    idToBundle: sortObjectProperties({
      ...idToNamedBundle,
      ...idToVatBundle,
      ...idToDeviceBundle,
    }),
  };
  for (const name of Object.keys(nameToBundle)) {
    kconfig.namedBundleIDs[name] = nameToBundle[name].id;
  }
  delete kconfig.bundles;
  return kconfig;
}

/** @type {(kernelStorage: SwingStoreKernelStorage) => void} */
const assertUninitialized = kernelStorage => {
  !swingsetIsInitialized(kernelStorage) ||
    Fail`kernel store already initialized`;
};

/**
 * Initialize kernel state from a pre-built kernel config.
 *
 * @param {SwingSetKernelConfig} kernelConfig
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {InitializeSwingsetRuntimeOptions} runtimeOptions
 * @returns {Promise<string | undefined>} KPID of the bootstrap message result promise
 */
export async function initializeSwingsetKernel(
  kernelConfig,
  kernelStorage,
  runtimeOptions = {},
) {
  assertUninitialized(kernelStorage);

  const {
    bundleHandler = makeWorkerBundleHandler(
      kernelStorage.bundleStore,
      makeXsnapBundleData(),
    ),
  } = runtimeOptions;

  return initializeKernel(kernelConfig, kernelStorage, { bundleHandler });
}

/**
 * @deprecated For tests use initializeTestSwingset()
 *
 * @param {SwingSetConfig} config
 * @param {unknown} bootstrapArgs
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {InitializationOptions} initializationOptions
 * @param {InitializeSwingsetRuntimeOptions} runtimeOptions
 * @returns {Promise<string | undefined>} KPID of the bootstrap message result promise
 */
export async function initializeSwingset(
  config,
  bootstrapArgs,
  kernelStorage,
  initializationOptions = {},
  runtimeOptions = {},
) {
  assertUninitialized(kernelStorage);
  const kernelConfig = await buildSwingsetKernelConfig(
    config,
    bootstrapArgs,
    initializationOptions,
    runtimeOptions,
  );
  if (runtimeOptions.verbose) kdebugEnable(true);
  return initializeSwingsetKernel(kernelConfig, kernelStorage, runtimeOptions);
}
