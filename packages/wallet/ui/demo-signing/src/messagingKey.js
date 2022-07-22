// @ts-check
import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { Random } from '@cosmjs/crypto';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GenericAuthorization } from 'cosmjs-types/cosmos/authz/v1beta1/authz';

import { bech32Config, SwingsetMsgs } from './chainInfo.js';

const CosmosMessages = /** @type {const} */ ({
  authz: {
    MsgGrant: {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
    },
    GenericAuthorization: {
      typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
    },
    MsgExec: {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
    },
  },
  feegrant: {
    MsgGrantAllowance: {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
    },
    BasicAllowance: {
      typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
    },
  },
});

const { freeze } = Object;
/**
 * @param {object} io
 * @param {typeof window.localStorage} io.localStorage
 */
export const makeMessagingSigner = async ({ localStorage }) => {
  const KEY = 'Agoric Messaging Key';
  const KEY_SIZE = 32;

  /** @param {Uint8Array} seed */
  const save = seed => localStorage.setItem(KEY, toBase64(seed));

  const findOrCreate = () => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      return fromBase64(stored);
    }
    console.log('generating Agoric Messaging Key');
    const seed = Random.getBytes(KEY_SIZE);
    save(seed);
    return seed;
  };
  const seed = findOrCreate();
  const wallet = await DirectSecp256k1Wallet.fromKey(
    seed,
    bech32Config.bech32PrefixAccAddr,
  );

  const accounts = await wallet.getAccounts();
  console.log({ accounts });

  const [{ address }] = accounts;

  return freeze({
    address,
    wallet,
  });
};

/**
 * @param {string} granter bech32 address
 * @param {string} grantee bech32 address
 * @param {number} seconds expiration as seconds (Date.now() / 1000)
 */
export const makeGrantWalletActionMessage = (granter, grantee, seconds) => {
  return {
    typeUrl: CosmosMessages.authz.MsgGrant.typeUrl,
    value: {
      granter,
      grantee,
      grant: {
        authorization: {
          typeUrl: CosmosMessages.authz.GenericAuthorization.typeUrl,
          value: GenericAuthorization.encode(
            GenericAuthorization.fromPartial({
              msg: SwingsetMsgs.MsgWalletAction.typeUrl,
            }),
          ).finish(),
        },
        expiration: { seconds },
      },
    },
  };
};

/**
 * @param {string} granter bech32 address
 * @param {string} grantee bech32 address
 * @param {string} allowance number of uist (TODO: fix uist magic string denom)
 * @param {number} seconds expiration as seconds (Date.now() / 1000)
 */
export const makeFeeGrantMessage = (granter, grantee, allowance, seconds) => {
  return {
    typeUrl: CosmosMessages.feegrant.MsgGrantAllowance.typeUrl,
    value: {
      granter,
      grantee,
      allowance: {
        typeUrl: CosmosMessages.feegrant.BasicAllowance.typeUrl,
        value: {
          spendLimit: [{ denom: 'urun', amount: allowance }],
          expiration: { seconds },
        },
      },
    },
  };
};

/**
 *
 * @param {string} grantee
 * @param {import('@cosmjs/proto-signing').EncodeObject[]} msgObjs
 * @param {import('@cosmjs/proto-signing').Registry} registry
 */
export const makeExecMessage = (grantee, msgObjs, registry) => {
  console.log('@@exec', { msgObjs });
  const msgs = msgObjs.map(obj => ({
    typeUrl: obj.typeUrl,
    value: registry.encode(obj),
  }));
  console.log('@@exec', { msgs });
  return {
    typeUrl: CosmosMessages.authz.MsgExec.typeUrl,
    value: { grantee, msgs },
  };
};
