/**
 * Kernel's keeper of persistent state for a device.
 */

import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistDeviceID } from '../id';

const FIRST_DEVICE_STATE_ID = 10n;

/**
 * Establish a device's state.
 *
 * @param {*} storage  The storage in which the persistent state will be kept
 * @param {string} deviceID  The device ID string of the device in question
 *
 * TODO move into makeDeviceKeeper?
 */
export function initializeDeviceState(storage, deviceID) {
  storage.set(`${deviceID}.o.nextID`, `${FIRST_DEVICE_STATE_ID}`);
}

/**
 * Produce a device keeper for a device.
 *
 * @param {*} storage  The storage in which the persistent state will be kept
 * @param {string} deviceID  The device ID string of the device in question
 * @param {*} addKernelDeviceNode  Kernel function to add a new device node to the
 *    kernel's mapping tables.
 *
 * @returns {*} an object to hold and access the kernel's state for the given device
 */
export function makeDeviceKeeper(storage, deviceID, addKernelDeviceNode) {
  insistDeviceID(deviceID);

  function setSourceAndOptions(source, options) {
    assert.typeof(source, 'object');
    assert(source.bundle || source.bundleName);
    assert.typeof(options, 'object');
    storage.set(`${deviceID}.source`, JSON.stringify(source));
    storage.set(`${deviceID}.options`, JSON.stringify(options));
  }

  function getSourceAndOptions() {
    const source = JSON.parse(storage.get(`${deviceID}.source`));
    const options = JSON.parse(storage.get(`${deviceID}.options`));
    return harden({ source, options });
  }

  /**
   * Provide the kernel slot corresponding to a given device slot, including
   * creating the kernel slot if it doesn't already exist.
   *
   * @param {string} devSlot  The device slot of interest
   *
   * @returns {string} the kernel slot that devSlot maps to
   *
   * @throws {Error} if devSlot is not a kind of thing that can be exported by devices
   *    or is otherwise invalid.
   */
  function mapDeviceSlotToKernelSlot(devSlot) {
    assert.typeof(devSlot, 'string', X`non-string devSlot: ${devSlot}`);
    // kdebug(`mapOutbound ${devSlot}`);
    const devKey = `${deviceID}.c.${devSlot}`;
    if (!storage.has(devKey)) {
      const { type, allocatedByVat } = parseVatSlot(devSlot);

      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          assert.fail(X`devices cannot export Objects`);
        } else if (type === 'promise') {
          assert.fail(X`devices cannot export Promises`);
        } else if (type === 'device') {
          kernelSlot = addKernelDeviceNode(deviceID);
        } else {
          assert.fail(X`unknown type ${type}`);
        }
        const kernelKey = `${deviceID}.c.${kernelSlot}`;
        storage.set(kernelKey, devSlot);
        storage.set(devKey, kernelSlot);
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        assert.fail(X`unknown devSlot ${devSlot}`);
      }
    }

    return storage.get(devKey);
  }

  /**
   * Provide the device slot corresponding to a given kernel slot, including
   * creating the device slot if it doesn't already exist.
   *
   * @param {string} kernelSlot  The kernel slot of interest
   *
   * @returns {string} the device slot kernelSlot maps to
   *
   * @throws {Error} if kernelSlot is not a kind of thing that can be imported by
   *    devices or is otherwise invalid.
   */
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    const kernelKey = `${deviceID}.c.${kernelSlot}`;
    if (!storage.has(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(BigInt(storage.get(`${deviceID}.o.nextID`)));
        storage.set(`${deviceID}.o.nextID`, `${id + 1n}`);
      } else if (type === 'device') {
        throw new Error('devices cannot import other device nodes');
      } else if (type === 'promise') {
        throw new Error('devices cannot import Promises');
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      const devSlot = makeVatSlot(type, false, id);

      const devKey = `${deviceID}.c.${devSlot}`;
      storage.set(devKey, kernelSlot);
      storage.set(kernelKey, devSlot);
    }

    return storage.get(kernelKey);
  }

  /**
   * Obtain the device's state.
   *
   * @returns {any} this device's state, or undefined if it has none.
   */
  function getDeviceState() {
    // this should return an object, generally CapData, or undefined
    const key = `${deviceID}.deviceState`;
    if (storage.has(key)) {
      return JSON.parse(storage.get(key));
      // todo: formalize the CapData, and store .deviceState.body, and
      // .deviceState.slots as 'vatSlot[,vatSlot..]'
    }
    return undefined;
  }

  /**
   * Set this device's state.
   *
   * @param {any} value The value to set the state to.  This should be serializable.
   *    (NOTE: the intent is that the structure here will eventually be more
   *    codified than it is now).
   */
  function setDeviceState(value) {
    storage.set(`${deviceID}.deviceState`, JSON.stringify(value));
  }

  /**
   * Produce a dump of this device's state for debugging purposes.
   *
   * @returns {Array<[string, string, string]>} an array of this device's state information
   */
  function dumpState() {
    const res = [];
    const prefix = `${deviceID}.c.`;
    for (const k of storage.getKeys(prefix, `${deviceID}.c/`)) {
      // The bounds passed to getKeys() here work because '/' is the next
      // character in ASCII after '.'
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const devSlot = slot;
          const kernelSlot = storage.get(k);
          res.push([kernelSlot, deviceID, devSlot]);
        }
      }
    }
    return harden(res);
  }

  return harden({
    getSourceAndOptions,
    setSourceAndOptions,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
    getDeviceState,
    setDeviceState,
    dumpState,
  });
}
