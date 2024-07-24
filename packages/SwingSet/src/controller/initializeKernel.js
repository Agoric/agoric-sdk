/* eslint-disable no-use-before-define */

import { assert, Fail } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';
import { Far } from '@endo/far';
import { kser, kunser } from '@agoric/kmarshal';
import { assertKnownOptions } from '../lib/assertOptions.js';
import { insistVatID } from '../lib/id.js';
import { makeVatSlot } from '../lib/parseVatSlots.js';
import { insistStorageAPI } from '../lib/storageAPI.js';
import { makeVatOptionRecorder } from '../lib/recordVatOptions.js';
import makeKernelKeeper, {
  DEFAULT_DELIVERIES_PER_BOYD,
  DEFAULT_GC_KREFS_PER_BOYD,
} from '../kernel/state/kernelKeeper.js';
import { exportRootObject } from '../kernel/kernel.js';
import { makeKernelQueueHandler } from '../kernel/kernelQueue.js';

/**
 * @typedef { import('../types-external.js').SwingSetKernelConfig } SwingSetKernelConfig
 * @typedef { import('../types-external.js').SwingStoreKernelStorage } SwingStoreKernelStorage
 * @typedef { import('../types-internal.js').InternalKernelOptions } InternalKernelOptions
 * @typedef { import('../types-internal.js').ReapDirtThreshold } ReapDirtThreshold
 */

function makeVatRootObjectSlot() {
  return makeVatSlot('object', true, 0);
}

/**
 * @param {SwingSetKernelConfig} config
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {*} [options]
 * @returns {Promise<string | undefined>} KPID of the bootstrap message
 *                                        result promise
 */

export async function initializeKernel(config, kernelStorage, options = {}) {
  const {
    verbose = false,
    bundleHandler, // required if config has xsnap-based static vats
  } = options;
  const logStartup = verbose ? console.debug : () => 0;
  insistStorageAPI(kernelStorage.kvStore);

  const kernelKeeper = makeKernelKeeper(kernelStorage, 'uninitialized');
  const optionRecorder = makeVatOptionRecorder(kernelKeeper, bundleHandler);

  const {
    defaultManagerType,
    defaultReapInterval = DEFAULT_DELIVERIES_PER_BOYD,
    defaultReapGCKrefs = DEFAULT_GC_KREFS_PER_BOYD,
    relaxDurabilityRules,
    snapshotInitial,
    snapshotInterval,
  } = config;
  /** @type { ReapDirtThreshold } */
  const defaultReapDirtThreshold = {
    deliveries: defaultReapInterval,
    gcKrefs: defaultReapGCKrefs,
    computrons: 'never', // TODO no knob?
  };
  /** @type { InternalKernelOptions } */
  const kernelOptions = {
    defaultManagerType,
    defaultReapDirtThreshold,
    relaxDurabilityRules,
    snapshotInitial,
    snapshotInterval,
  };
  kernelKeeper.createStartingKernelState(kernelOptions);

  for (const id of Object.keys(config.idToBundle || {})) {
    const bundle = config.idToBundle[id];
    assert(bundle.moduleFormat === 'endoZipBase64');
    if (!kernelKeeper.hasBundle(id)) {
      kernelKeeper.addBundle(id, bundle);
    }
  }

  for (const name of Object.keys(config.namedBundleIDs || {})) {
    const id = config.namedBundleIDs[name];
    kernelKeeper.addNamedBundleID(name, id);
  }

  let gotVatAdminRootKref;

  // generate the genesis vats
  await null;
  if (config.vats && Object.keys(config.vats).length) {
    for (const name of Object.keys(config.vats)) {
      const {
        bundleID,
        parameters: vatParameters = {},
        creationOptions = {},
      } = config.vats[name];
      logStartup(`adding vat '${name}' from bundle ${bundleID}`);
      bundleID || Fail`no bundleID specified for vat ${name}`;

      // todo: consider having vats indicate 'enablePipelining' by exporting a
      // boolean, rather than options= . We'd have to retrieve the flag from
      // the VatManager, since it isn't available until the bundle is evaluated
      assertKnownOptions(creationOptions, [
        'enablePipelining',
        'metered',
        'managerType',
        'enableDisavow',
        'enableSetup',
        'useTranscript',
        'critical',
        'reapInterval',
        'reapGCKrefs',
        'neverReap',
        'nodeOptions',
      ]);
      const vatID = kernelKeeper.allocateVatIDForNameIfNeeded(name);
      logStartup(`assigned VatID ${vatID} for genesis vat ${name}`);

      const source = { bundleID };
      const staticOptions = { name, ...creationOptions };
      await optionRecorder.recordStatic(vatID, source, staticOptions);

      kernelKeeper.addToAcceptanceQueue(
        harden({ type: 'startVat', vatID, vatParameters: kser(vatParameters) }),
      );
      if (name === 'vatAdmin') {
        // Create a kref for the vatAdmin root, so the kernel can tell it
        // about creation/termination of dynamic vats, and the installation
        // of bundles
        const kref = exportRootObject(kernelKeeper, vatID);
        // Pin, to prevent it being GC'd when only the kvStore points to it
        kernelKeeper.pinObject(kref);
        kernelKeeper.kvStore.set('vatAdminRootKref', kref);
        gotVatAdminRootKref = true;
      }
    }
    gotVatAdminRootKref || Fail`a vat admin vat is required`;
  }

  // generate the devices
  let haveAdminDevice = false;
  if (config.devices) {
    for (const name of Object.keys(config.devices)) {
      const {
        bundleID,
        parameters: deviceParameters = {},
        creationOptions = {},
      } = config.devices[name];
      logStartup(`adding device '${name}' from bundle ${bundleID}`);
      bundleID || Fail`no bundleID for device ${name}`;
      creationOptions.deviceParameters = deviceParameters;

      const deviceID = kernelKeeper.allocateDeviceIDForNameIfNeeded(name);
      logStartup(`assigned DeviceID ${deviceID} for genesis device ${name}`);
      const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
      deviceKeeper.setSourceAndOptions({ bundleID }, creationOptions);
      if (name === 'vatAdmin') {
        haveAdminDevice = true;
      }
    }
    haveAdminDevice || Fail`a vat admin device is required`;
  }

  // And enqueue the bootstrap() call. If we're reloading from an
  // initialized state vector, this call will already be in the bootstrap
  // vat's transcript, so we don't re-queue it.
  let bootstrapResultKpid;
  if (config.bootstrap) {
    const bootstrapVatID = kernelKeeper.getVatIDForName(config.bootstrap);
    logStartup(`=> queueing bootstrap()`);
    bootstrapResultKpid = enqueueBootstrap(bootstrapVatID);
    if (config.pinBootstrapRoot) {
      const kref = exportRootObject(kernelKeeper, bootstrapVatID);
      kernelKeeper.pinObject(kref);
    }
  }
  kernelKeeper.setInitialized();
  kernelKeeper.emitCrankHashes(); // initialized kernel state is hashed as if it were crank #0
  return bootstrapResultKpid;

  // ----------------------------------------------------------------------

  /**
   * @param {import('../types-internal.js').VatID} bootstrapVatID
   * @returns {string} the KPID of the bootstrap message result promise
   */
  function enqueueBootstrap(bootstrapVatID) {
    // we invoke obj[0].bootstrap with an object that contains 'vats'.
    insistVatID(bootstrapVatID);
    // each key of 'vats' will be serialized as a reference to its obj0
    const vrefs = new Map();
    const vatObj0s = {};
    const vatSlot = makeVatRootObjectSlot();
    for (const [name, vatID] of kernelKeeper.getStaticVats()) {
      // we happen to give bootstrap to itself, because unit tests that
      // don't have any other vats (bootstrap-only configs) then get a
      // non-empty object as vatObj0s, since an empty object would be
      // serialized as pass-by-presence. It wouldn't make much sense for the
      // bootstrap object to call itself, though.
      const vref = Far('root', {});
      vatObj0s[name] = vref;
      const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
      const kernelSlot = vatKeeper.mapVatSlotToKernelSlot(vatSlot);
      vrefs.set(vref, kernelSlot);
      logStartup(`adding vref ${name} [${vatID}]`);
    }

    const drefs = new Map();
    const deviceObj0s = {};
    for (const [name, deviceID] of kernelKeeper.getDevices()) {
      const dref = Far('device', {});
      deviceObj0s[name] = dref;
      const devSlot = makeVatSlot('device', true, 0);
      const devKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
      const kernelSlot = devKeeper.mapDeviceSlotToKernelSlot(devSlot);
      drefs.set(dref, kernelSlot);
      logStartup(`adding dref ${name} [${deviceID}]`);
    }

    function convertValToSlot(val) {
      if (vrefs.has(val)) {
        return vrefs.get(val);
      }
      if (drefs.has(val)) {
        return drefs.get(val);
      }
      console.error(`oops ${val}`, val);
      throw Error('bootstrap got unexpected pass-by-presence');
    }

    const { queueToKref } = makeKernelQueueHandler({ kernelKeeper });

    const m = makeMarshal(convertValToSlot, undefined, {
      marshalName: 'kernel:bootstrap',
      serializeBodyFormat: 'smallcaps',
      // TODO Temporary hack.
      // See https://github.com/Agoric/agoric-sdk/issues/2780
      errorIdNum: 60_000,
    });
    // @ts-expect-error xxx
    const args = kunser(m.serialize(harden([vatObj0s, deviceObj0s])));
    const rootKref = exportRootObject(kernelKeeper, bootstrapVatID);
    const resultKpid = queueToKref(rootKref, 'bootstrap', args, 'panic');
    assert(resultKpid); // appease tsc: 'panic' ensures a kpid is returned
    kernelKeeper.incrementRefCount(resultKpid, 'external');
    return resultKpid;
  }
}
