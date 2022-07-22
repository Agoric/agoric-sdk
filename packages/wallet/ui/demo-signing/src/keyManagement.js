// @ts-check
import { fromBech32, toBech32, fromBase64, toBase64 } from '@cosmjs/encoding';
import { Random } from '@cosmjs/crypto';
import { DirectSecp256k1Wallet, Registry } from '@cosmjs/proto-signing';
import { GenericAuthorization } from 'cosmjs-types/cosmos/authz/v1beta1/authz';
import { QueryClientImpl } from 'cosmjs-types/cosmos/authz/v1beta1/query';

import { AminoTypes, defaultRegistryTypes } from '@cosmjs/stargate';

import * as stargateStar from '@cosmjs/stargate';

import { stableCurrency, bech32Config, SwingsetMsgs } from './chainInfo.js';
import { MsgWalletAction } from './gen/swingset/msgs';

const { freeze } = Object;
const { QueryClient } = stargateStar;

/**
 * The typeUrl of a message pairs a package name with a message name.
 * For example, from:
 *
 * package cosmos.authz.v1beta1;
 * message MsgGrant { ... }
 *
 * we get `/cosmos.authz.v1beta1.MsgGrant`
 *
 * https://github.com/cosmos/cosmos-sdk/blob/main/proto/cosmos/authz/v1beta1/tx.proto#L34
 * https://github.com/cosmos/cosmos-sdk/blob/00805e564755f696c4696c6abe656cf68678fc83/proto/cosmos/authz/v1beta1/tx.proto#L34
 */
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

/**
 * TODO: estimate fee? use 'auto' fee?
 *
 * @returns {import('@cosmjs/stargate').StdFee}
 */
export const trivialFee = () => {
  const { coinMinimalDenom: denom } = stableCurrency;
  const fee = {
    amount: [{ amount: '0', denom }],
    gas: '100000', // TODO: estimate gas?
  };
  return fee;
};

/**
 * @typedef {{
 *   typeUrl: '/agoric.swingset.MsgWalletAction',
 *   value: {
 *     owner: string, // base64 of raw bech32 data
 *     action: string,
 *   }
 * }} WalletAction
 */

/** @type {(address: string) => Uint8Array} */
export function toAccAddress(address) {
  return fromBech32(address).data;
}

/** @type {import('@cosmjs/stargate').AminoConverters} */
const SwingsetConverters = {
  // '/agoric.swingset.MsgProvision': {
  //   /* ... */
  // },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: proto => {
      const { action, owner } = proto;
      // ISSUE: need to keep "dictionaries" sorted?
      const amino = {
        action,
        owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
      };
      console.log('@@toAmino:', { proto, amino });
      return amino;
    },
    fromAmino: amino => {
      const { action, owner } = amino;
      const proto = { action, owner: toBase64(toAccAddress(owner)) };
      console.log('@@fromAmino:', { amino, proto });
      return proto;
    },
  },
};

const aRegistry = new Registry([
  ...defaultRegistryTypes,
  [SwingsetMsgs.MsgWalletAction.typeUrl, MsgWalletAction],
]);

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

  /**
   *
   * @param {{ granter: string, msgTypeUrl: string}} constraints
   * @param {import('@cosmjs/tendermint-rpc').Tendermint34Client} rpcClient
   */
  const queryGrants = async ({ granter, msgTypeUrl }, rpcClient) => {
    const base = QueryClient.withExtensions(rpcClient);
    const rpc = stargateStar.createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    const result = await queryService.Grants({
      granter,
      grantee: address,
      msgTypeUrl: '',
    });
    for (const g of result.grants) {
      console.log('g.authorization:', g.authorization);
      const x = GenericAuthorization.decode(g.authorization.value);
      console.log({ x });
    }
    return result;
  };

  return freeze({
    address,
    registry: aRegistry,
    wallet,
    queryGrants,
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

/**
 * @param {string} granter in the authz sense
 * @param {string} grantee in the authz sense
 * @param {string} action WalletAction.action
 * @returns {import('@cosmjs/proto-signing').EncodeObject[]}
 */
export const makeExecActionMessages = (granter, grantee, action) => {
  const act1 = {
    typeUrl: SwingsetMsgs.MsgWalletAction.typeUrl,
    value: {
      owner: toBase64(toAccAddress(granter)),
      action,
    },
  };
  const msgs = [makeExecMessage(grantee, [act1], aRegistry)];
  return msgs;
};

/**
 * @param {import('@keplr-wallet/types').ChainInfo} chainInfo
 * @param {NonNullable<KeplrWindow['keplr']>} keplr
 * @param {typeof import('@cosmjs/stargate').SigningStargateClient.connectWithSigner} connectWithSigner
 * @typedef {import('@keplr-wallet/types').Window} KeplrWindow
 */
export const makeSigner = async (chainInfo, keplr, connectWithSigner) => {
  // const chainId = ui.selectValue('select[name="chainId"]');
  // console.log({ chainId });

  const { chainId } = chainInfo;
  const { coinMinimalDenom: denom } = stableCurrency;

  // https://docs.keplr.app/api/#get-address-public-key
  const key = await keplr.getKey(chainId);
  console.log({ key });

  // const offlineSigner = await keplr.getOfflineSignerOnlyAmino(chainId);
  const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
  console.log({ offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;

  const cosmJS = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(SwingsetConverters),
    registry: aRegistry,
  });
  console.log({ cosmJS });

  const fee = {
    amount: [{ amount: '100', denom }],
    gas: '100000', // TODO: estimate gas?
  };
  const allowance = '250000'; // 0.25 IST

  return freeze({
    address, // TODO: address can change
    isNanoLedger: key.isNanoLedger,
    authorizeMessagingKey: async (grantee, t0) => {
      const expiration = t0 / 1000 + 4 * 60 * 60;
      const msgs = [
        makeGrantWalletActionMessage(address, grantee, expiration),

        // cosmos support for fee-account in MsgExec hasn't landed yet
        // https://github.com/cosmos/cosmjs/issues/1155
        // https://github.com/cosmos/cosmjs/pull/1159
        // makeFeeGrantMessage(address, grantee, allowance, expiration),
      ];
      console.log('sign', { address, msgs, fee });
      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, '');

      console.log({ tx });
      return tx;
    },
    acceptOffer: async (action, memo) => {
      const { accountNumber, sequence } = await cosmJS.getSequence(address);
      console.log({ accountNumber, sequence });

      /** @type {WalletAction} */
      const act1 = {
        typeUrl: '/agoric.swingset.MsgWalletAction', // TODO: SpendAction
        value: {
          owner: toBase64(toAccAddress(address)),
          action,
        },
      };

      const msgs = [act1];

      // const signDoc = {
      //   chain_id: chainId,
      //   account_number: `${accountNumber}`,
      //   sequence: `${sequence}`,
      //   fee,
      //   memo,
      //   msgs,
      // };

      // const tx = await cosmJS.signAmino(chainId, account.address, signDoc);
      // const signerData = { accountNumber, sequence, chainId };
      console.log('sign', { address, msgs, fee, memo });

      // const tx = await offlineSigner.signAmino(address, signDoc);

      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, memo);

      console.log({ tx });
      return tx;
    },
  });
};
