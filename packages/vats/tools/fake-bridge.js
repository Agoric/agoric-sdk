// @ts-check
import { assert, Fail } from '@agoric/assert';
import { makeTracer, VBankAccount } from '@agoric/internal';
import { E } from '@endo/far';
import { makeWhen } from '@agoric/vow/src/when.js';
import { Nat } from '@endo/nat';

/**
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {MsgDelegateResponse, MsgUndelegateResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
 * @import {BridgeHandler, ScopedBridgeManager} from '../src/types.js';
 * @import {Remote} from '@agoric/vow';
 */
const trace = makeTracer('FakeBridge');

const when = makeWhen();

/** @typedef {{ [address: string]: { [denom: string]: bigint } }} Balances */

export const FAUCET_ADDRESS = 'faucet';
const INFINITE_AMOUNT = 99999999999n;

/**
 * You can withdraw from the `faucet` address infinitely because its balance is
 * always huge. When you withdraw, it's as if it is topped up again by a Cosmos
 * transaction outside the Agoric VM. (Similarly for deposits.)
 *
 * @param {import('@agoric/zone').Zone} zone
 * @param {object} opts
 * @param {Balances} opts.balances initial balances
 * @returns {ScopedBridgeManager<'bank'>}
 * @see {makeFakeBankManagerKit} and its `pourPayment` for a helper
 */
export const makeFakeBankBridge = (zone, opts = { balances: {} }) => {
  const { balances } = opts;

  const currentBalance = ({ address, denom }) =>
    address === FAUCET_ADDRESS
      ? INFINITE_AMOUNT
      : Nat((balances[address] && balances[address][denom]) ?? 0n);

  let lastNonce = 0n;
  /** @type {Remote<BridgeHandler>} */
  let hndlr;
  return zone.exo('Fake Bank Bridge Manager', undefined, {
    getBridgeId: () => 'bank',
    toBridge: async obj => {
      const { method, type, ...params } = obj;
      trace('toBridge', type, method, params);
      switch (obj.type) {
        case 'VBANK_GET_MODULE_ACCOUNT_ADDRESS': {
          const { moduleName } = obj;
          const moduleDescriptor = Object.values(VBankAccount).find(
            ({ module }) => module === moduleName,
          );
          if (!moduleDescriptor) {
            return 'undefined';
          }
          return moduleDescriptor.address;
        }

        // Observed message:
        // address: 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346',
        // denom: 'ibc/toyatom',
        // type: 'VBANK_GET_BALANCE'
        case 'VBANK_GET_BALANCE': {
          return String(currentBalance(obj));
        }

        case 'VBANK_GRAB':
        case 'VBANK_GIVE': {
          const { amount, denom } = obj;
          const address = type === 'VBANK_GRAB' ? obj.sender : obj.recipient;
          (address && typeof address === 'string') ||
            Fail`invalid address ${address}`;
          balances[address] ||= {};
          balances[address][denom] ||= 0n;

          if (type === 'VBANK_GRAB') {
            balances[address][denom] = Nat(
              currentBalance({ address, denom }) - BigInt(amount),
            );
          } else {
            balances[address][denom] = Nat(
              currentBalance({ address, denom }) + BigInt(amount),
            );
          }

          lastNonce += 1n;
          // Also empty balances.
          return harden({
            type: 'VBANK_BALANCE_UPDATE',
            nonce: `${lastNonce}`,
            updated: [
              {
                address,
                denom,
                amount: String(currentBalance({ address, denom })),
              },
            ],
          });
        }
        default:
          Fail`unknown type ${type}`;
      }
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      trace('fromBridge', obj);
      return when(E(hndlr).fromBridge(obj));
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
 * @param {(obj) => void} onToBridge
 * @returns {ScopedBridgeManager<'dibc'>}
 */
export const makeFakeIbcBridge = (zone, onToBridge) => {
  /** @type {Remote<BridgeHandler>} */
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
      return when(E(hndlr).fromBridge(obj));
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

export const LOCALCHAIN_DEFAULT_ADDRESS = 'agoric1fakeLCAAddress';

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} [onToBridge]
 * @returns {ScopedBridgeManager<'vlocalchain'>}
 */
export const makeFakeLocalchainBridge = (zone, onToBridge = () => {}) => {
  /** @type {Remote<BridgeHandler>} */
  let hndlr;
  let lcaExecuteTxSequence = 0;
  return zone.exo('Fake Localchain Bridge Manager', undefined, {
    getBridgeId: () => 'vlocalchain',
    toBridge: async obj => {
      onToBridge(obj);
      const { method, type, ...params } = obj;
      trace('toBridge', type, method, params);
      switch (type) {
        case 'VLOCALCHAIN_ALLOCATE_ADDRESS':
          return LOCALCHAIN_DEFAULT_ADDRESS;
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
                return /** @type {JsonSafe<MsgDelegateResponse>} */ ({});
              }
              case '/cosmos.staking.v1beta1.MsgUndelegate': {
                return /** @type {JsonSafe<MsgUndelegateResponse>} */ ({
                  completionTime: new Date().toJSON(),
                });
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
      return when(E(hndlr).fromBridge(obj));
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
 * @returns {ScopedBridgeManager<'vtransfer'>}
 */
export const makeFakeTransferBridge = (zone, onToBridge = () => {}) => {
  /** @type {Remote<BridgeHandler>} */
  let hndlr;
  const registered = zone.setStore('registered');
  return zone.exo('Fake Transfer Bridge Manager', undefined, {
    getBridgeId: () => 'vtransfer',
    toBridge: async obj => {
      onToBridge(obj);
      const { type, ...params } = obj;
      trace('toBridge', type, params);
      switch (type) {
        case 'BRIDGE_TARGET_REGISTER': {
          registered.add(params.target);
          return undefined;
        }
        case 'BRIDGE_TARGET_UNREGISTER': {
          registered.delete(params.target);
          return undefined;
        }
        default:
          Fail`unknown type ${type}`;
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      return when(E(hndlr).fromBridge(obj));
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
