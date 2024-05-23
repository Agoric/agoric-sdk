import { Fail } from '@agoric/assert';
import assert from 'node:assert/strict';

/** @import {ScopedBridgeManager} from '../src/types.js'; */

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} onToBridge
 * @param {(handler, obj) => Promise<void>} onFromBridge
 * @returns {ScopedBridgeManager<'dibc'>}
 */
export const fakeIbcBridge = (zone, onToBridge, onFromBridge) => {
  let hndlr;
  return zone.exo('Fake IBC Bridge Manager', undefined, {
    getBridgeId: () => 'dibc',
    toBridge: async obj => {
      onToBridge(obj);
      const { method, type, ...params } = obj;
      assert.equal(type, 'IBC_METHOD');
      if (method === 'sendPacket') {
        const { packet } = params;
        return { ...packet, sequence: '39' };
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      await onFromBridge(hndlr, obj);
    },
    initHandler: h => {
      if (hndlr) throw Error('already init');
      hndlr = h;
    },
    setHandler: h => {
      if (!hndlr) throw Error('must init first');
      hndlr = h;
    },
  });
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} [onToBridge]
 * @param {(handler, obj) => ERef<void>} [onFromBridge]
 * @returns {ScopedBridgeManager<'vlocalchain'>}
 */
export const fakeLocalchainBridge = (
  zone,
  onToBridge = () => {},
  onFromBridge = () => {},
) => {
  let hndlr;
  return zone.exo('Fake Localchain Bridge Manager', undefined, {
    getBridgeId: () => 'vlocalchain',
    toBridge: async obj => {
      onToBridge(obj);
      const { method, type, ...params } = obj;
      console.info('toBridge', type, method, params);
      switch (type) {
        case 'VLOCALCHAIN_ALLOCATE_ADDRESS':
          return 'agoric1fakeBridgeAddress';
        default:
          Fail`unknown type ${type}`;
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      await onFromBridge(hndlr, obj);
    },
    initHandler: h => {
      if (hndlr) throw Error('already init');
      hndlr = h;
    },
    setHandler: h => {
      if (!hndlr) throw Error('must init first');
      hndlr = h;
    },
  });
};
