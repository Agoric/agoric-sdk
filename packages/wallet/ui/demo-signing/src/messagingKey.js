// @ts-check
import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { Random } from '@cosmjs/crypto';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GenericAuthorization } from 'cosmjs-types/cosmos/authz/v1beta1/authz';
import { BasicAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/feegrant';

import { bech32Config, SwingsetMsgs } from './chainInfo.js';

const CosmosMessages = {
  authz: {
    MsgGrant: {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
    },
    GenericAuthorization: {
      typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
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
};

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
  return freeze({ address });
};

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

export const makeFeeGrantMessage = (granter, grantee, allowance, seconds) => {
  return {
    typeUrl: CosmosMessages.feegrant.MsgGrantAllowance.typeUrl,
    value: {
      granter,
      grantee,
      allowance: {
        typeUrl: CosmosMessages.feegrant.BasicAllowance.typeUrl,
        value: BasicAllowance.encode(
          BasicAllowance.fromPartial({
            spendLimit: [{ denom: 'uist', amount: allowance }],
            expiration: { seconds },
          }),
        ).finish(),
      },
    },
  };
};
