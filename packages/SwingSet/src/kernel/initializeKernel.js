/* eslint-disable no-use-before-define */

import { makeMarshal, Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';
import { assertKnownOptions } from '../assertOptions';
import { insistVatID } from './id';
import { makeVatSlot } from '../parseVatSlots';
import { insistStorageAPI } from '../storageAPI';
import { wrapStorage } from './state/storageWrapper';
import makeKernelKeeper from './state/kernelKeeper';
import { doQueueToExport } from './kernel';

function makeVatRootObjectSlot() {
  return makeVatSlot('object', true, 0);
}

export function initializeKernel(config, hostStorage, verbose = false) {
  const logStartup = verbose ? console.debug : () => 0;

  insistStorageAPI(hostStorage);
  const { enhancedCrankBuffer, commitCrank } = wrapStorage(hostStorage);

  const kernelKeeper = makeKernelKeeper(enhancedCrankBuffer);

  const wasInitialized = kernelKeeper.getInitialized();
  assert(!wasInitialized);
  kernelKeeper.createStartingKernelState(config.defaultManagerType || 'local');

  if (config.bundles) {
    for (const name of Object.keys(config.bundles)) {
      kernelKeeper.addBundle(name, config.bundles[name].bundle);
    }
  }

  // generate the genesis vats
  if (config.vats) {
    for (const name of Object.keys(config.vats)) {
      const {
        bundle,
        bundleName,
        parameters: vatParameters = {},
        creationOptions = {},
      } = config.vats[name];
      logStartup(`adding vat '${name}' from bundle ${bundleName}`);

      if (bundle) {
        assert.typeof(
          bundle,
          'object',
          X`bundle is not an object, rather ${bundle}`,
        );
      } else {
        assert(bundleName, X`no bundle specified for vat ${name}`);
      }

      // todo: consider having vats indicate 'enablePipelining' by exporting a
      // boolean, rather than options= . We'd have to retrieve the flag from
      // the VatManager, since it isn't available until the bundle is evaluated
      assertKnownOptions(creationOptions, [
        'enablePipelining',
        'metered',
        'managerType',
        'enableDisavow',
        'enableSetup',
        'enableInternalMetering',
        'virtualObjectCacheSize',
      ]);
      creationOptions.vatParameters = vatParameters;
      creationOptions.description = `static name=${name}`;
      creationOptions.name = name;
      if (!creationOptions.managerType) {
        creationOptions.managerType = kernelKeeper.getDefaultManagerType();
      }

      const vatID = kernelKeeper.allocateVatIDForNameIfNeeded(name);
      logStartup(`assigned VatID ${vatID} for genesis vat ${name}`);
      const vatKeeper = kernelKeeper.allocateVatKeeper(vatID);
      vatKeeper.setSourceAndOptions({ bundle, bundleName }, creationOptions);
    }
  }

  // generate the devices
  let haveAdminDevice = false;
  if (config.devices) {
    for (const name of Object.keys(config.devices)) {
      const {
        bundleName = name,
        parameters: deviceParameters = {},
        creationOptions = {},
      } = config.devices[name];
      logStartup(`adding device '${name}' from bundle ${bundleName}`);

      const bundle =
        config.devices[name].bundle || config.bundles[bundleName].bundle;
      assert.typeof(
        bundle,
        'object',
        X`bundle is not an object, rather ${bundle}`,
      );
      creationOptions.deviceParameters = deviceParameters;

      const deviceID = kernelKeeper.allocateDeviceIDForNameIfNeeded(name);
      logStartup(`assigned DeviceID ${deviceID} for genesis device ${name}`);
      const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
      deviceKeeper.setSourceAndOptions({ bundle }, creationOptions);
      if (name === 'vatAdmin') {
        haveAdminDevice = true;
      }
    }
    assert(haveAdminDevice, X`a vat admin device is required`);
  }

  // And enqueue the bootstrap() call. If we're reloading from an
  // initialized state vector, this call will already be in the bootstrap
  // vat's transcript, so we don't re-queue it.
  let bootstrapResultKpid;
  if (config.bootstrap) {
    const bootstrapVatID = kernelKeeper.getVatIDForName(config.bootstrap);
    logStartup(`=> queueing bootstrap()`);
    bootstrapResultKpid = enqueueBootstrap(bootstrapVatID, kernelKeeper);
  }
  kernelKeeper.setInitialized();
  kernelKeeper.saveStats();
  commitCrank(); // commit initialized kernel state as crank #0
  return bootstrapResultKpid;

  // ----------------------------------------------------------------------

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
      const vref = Far('vref', {});
      vatObj0s[name] = vref;
      const vatKeeper = kernelKeeper.getVatKeeper(vatID);
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

    const m = makeMarshal(convertValToSlot, undefined, {
      marshalName: 'kernel:bootstrap',
      // TODO Temporary hack.
      // See https://github.com/Agoric/agoric-sdk/issues/2780
      errorIdNum: 60000,
    });
    const args = harden([vatObj0s, deviceObj0s]);
    // queueToExport() takes kernel-refs (ko+NN, kd+NN) in s.slots
    const rootSlot = makeVatRootObjectSlot();
    const resultKpid = doQueueToExport(
      kernelKeeper,
      bootstrapVatID,
      rootSlot,
      'bootstrap',
      m.serialize(args),
      'panic',
    );
    kernelKeeper.incrementRefCount(resultKpid, 'external');
    return resultKpid;
  }
}
