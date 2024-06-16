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

const makeFakeBridgeChannel = (zone, id, label, toBridge) => {
  /** @type {Remote<BridgeHandler>} */
  let hndlr;
  return zone.exo(`Fake ${label} Bridge Manager`, undefined, {
    getBridgeId: () => id,
    toBridge,
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

/** @typedef {{ [address: string]: { [denom: string]: bigint } }} Balances */

export const FAUCET_ADDRESS = 'faucet';

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
      ? 99999999999n
      : Nat((balances[address] && balances[address][denom]) ?? 0n);

  let lastNonce = 0n;
  return makeFakeBridgeChannel(zone, 'bank', 'Bank', async obj => {
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
  });
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} onToBridge
 * @returns {ScopedBridgeManager<'dibc'>}
 */
export const makeFakeIbcBridge = (zone, onToBridge) => {
  return makeFakeBridgeChannel(zone, 'dibc', 'IBC', async obj => {
    onToBridge(obj);
    const { method, type, ...params } = obj;
    assert.equal(type, 'IBC_METHOD');
    if (method === 'sendPacket') {
      const { packet } = params;
      return { ...packet, sequence: '39' };
    }
    return undefined;
  });
};

export const LOCALCHAIN_DEFAULT_ADDRESS = 'agoric1fakeLCAAddress';

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} [onToBridge]
 * @returns {ScopedBridgeManager<'vlocalchain'>}
 */
export const makeFakeLocalchainBridge = (zone, onToBridge = () => {}) => {
  let lcaExecuteTxSequence = 0;
  return makeFakeBridgeChannel(zone, 'vlocalchain', 'Localchain', async obj => {
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
                throw Error('simulated unexpected MsgTransfer packet timeout');
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
  });
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(obj) => void} [onToBridge]
 * @returns {ScopedBridgeManager<'vtransfer'>}
 */
export const makeFakeTransferBridge = (zone, onToBridge = () => {}) => {
  const registered = zone.setStore('registered');
  return makeFakeBridgeChannel(zone, 'vtransfer', 'Transfer', async obj => {
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
  });
};
