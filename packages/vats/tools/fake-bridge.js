import { Fail } from '@agoric/assert';
import assert from 'node:assert/strict';

/**
 * @import {MsgDelegateResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
 * @import {ScopedBridgeManager} from '../src/types.js';
 */

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} onToBridge
 * @param {(handler, obj) => Promise<void>} onFromBridge
 * @returns {ScopedBridgeManager<'dibc'>}
 */
export const makeFakeIbcBridge = (zone, onToBridge, onFromBridge) => {
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
export const makeFakeLocalchainBridge = (
  zone,
  onToBridge = () => {},
  onFromBridge = () => {},
) => {
  let hndlr;
  let lcaExecuteTxSequence = 0;
  return zone.exo('Fake Localchain Bridge Manager', undefined, {
    getBridgeId: () => 'vlocalchain',
    toBridge: async obj => {
      onToBridge(obj);
      const { method, type, ...params } = obj;
      console.info('toBridge', type, method, params);
      switch (type) {
        case 'VLOCALCHAIN_ALLOCATE_ADDRESS':
          return 'agoric1fakeLCAAddress';
        case 'VLOCALCHAIN_EXECUTE_TX': {
          lcaExecuteTxSequence += 1;
          return obj.messages.map(message => {
            switch (message['@type']) {
              // TODO #9402 reference bank to ensure caller has tokens they are transferring
              case '/ibc.applications.transfer.v1.MsgTransfer': {
                if (message.token.amount === '504') {
                  throw Error(
                    'simulated unexpected MsgTransfer packet timeout',
                  );
                }
                // like `JsonSafe<MsgTransferResponse>`, but bigints are converted to numbers
                // XXX should vlocalchain return a string instead of number for bigint?
                return {
                  sequence: lcaExecuteTxSequence,
                };
              }
              case '/cosmos.staking.v1beta1.MsgDelegate': {
                return /** @type {MsgDelegateResponse} */ {};
              }
              // returns one empty object per message unless specified
              default:
                return {};
            }
          });
        }
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
