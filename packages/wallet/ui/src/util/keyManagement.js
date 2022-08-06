// @ts-check
import { fromBech32, toBech32, fromBase64, toBase64 } from '@cosmjs/encoding';
import { DirectSecp256k1Wallet, Registry } from '@cosmjs/proto-signing';
import {
  AminoTypes,
  defaultRegistryTypes,
  QueryClient,
  createProtobufRpcClient,
  assertIsDeliverTxSuccess,
  createBankAminoConverters,
  createAuthzAminoConverters,
} from '@cosmjs/stargate';

import { GenericAuthorization } from 'cosmjs-types/cosmos/authz/v1beta1/authz.js';
import { QueryClientImpl } from 'cosmjs-types/cosmos/authz/v1beta1/query.js';

import {
  MsgWalletAction,
  MsgWalletSpendAction,
} from '@agoric/cosmic-proto/swingset/msgs.js';

import { stableCurrency, bech32Config } from './chainInfo.js';

/** @type {(address: string) => Uint8Array} */
export function toAccAddress(address) {
  return fromBech32(address).data;
}

const KEY_SIZE = 32; // as in bech32

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
  bank: {
    MsgSend: {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    },
  },
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
 * `/agoric.swingset.XXX` matches package agoric.swingset in swingset/msgs.go
 */
export const SwingsetMsgs = /** @type {const} */ ({
  MsgWalletAction: {
    typeUrl: '/agoric.swingset.MsgWalletAction',
    aminoType: 'swingset/WalletAction',
  },
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletAction',
  },
});

/**
 * @typedef {{
 *   owner: string, // base64 of raw bech32 data
 *   action: string,
 * }} WalletAction
 * @typedef {{
 *   owner: string, // base64 of raw bech32 data
 *   spendAction: string,
 * }} WalletSpendAction
 */

export const SwingsetRegistry = new Registry([
  ...defaultRegistryTypes,
  [SwingsetMsgs.MsgWalletAction.typeUrl, MsgWalletAction],
  [SwingsetMsgs.MsgWalletSpendAction.typeUrl, MsgWalletSpendAction],
]);

/**
 * TODO: estimate fee? use 'auto' fee?
 * https://github.com/Agoric/agoric-sdk/issues/5888
 *
 * @returns {import('@cosmjs/stargate').StdFee}
 */
export const zeroFee = () => {
  const { coinMinimalDenom: denom } = stableCurrency;
  const fee = {
    amount: [{ amount: '0', denom }],
    gas: '100000', // TODO: estimate gas?
  };
  return fee;
};

/** @type {import('@cosmjs/stargate').AminoConverters} */
const SwingsetConverters = {
  // TODO: #3628, #4654
  // '/agoric.swingset.MsgProvision': {
  //   /* ... */
  // },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: ({ action, owner }) => ({
      action,
      owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
    }),
    fromAmino: ({ action, owner }) => ({
      action,
      owner: toBase64(toAccAddress(owner)),
    }),
  },
  [SwingsetMsgs.MsgWalletSpendAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: ({ spendAction, owner }) => ({
      spendAction,
      owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
    }),
    fromAmino: ({ spendAction, owner }) => ({
      spendAction,
      owner: toBase64(toAccAddress(owner)),
    }),
  },
};

/**
 * key for use in localStorage
 *
 * arbitrary; suffix chosen randomly to avoid collisions
 */
export const STORAGE_KEY = 'agoric.eis0Aigi';

/**
 * Maintain a key for signing non-spending messages in localStorage.
 *
 * See also `delegateWalletAction()` below.
 *
 * @param {object} io
 * @param {typeof window.localStorage} io.localStorage
 * @param {typeof import('@cosmjs/crypto').Random.getBytes} io.getBytes for key generation
 */
export const makeBackgroundSigner = async ({ localStorage, getBytes }) => {
  const provideLocalKey = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return fromBase64(stored);
    }
    console.log(
      `localStorage.setItem(${STORAGE_KEY}, Random.getBytes(${KEY_SIZE}))`,
    );
    const seed = getBytes(KEY_SIZE);
    localStorage.setItem(STORAGE_KEY, toBase64(seed));
    return seed;
  };
  const seed = provideLocalKey();
  const wallet = await DirectSecp256k1Wallet.fromKey(
    seed,
    bech32Config.bech32PrefixAccAddr,
  );

  const accounts = await wallet.getAccounts();
  console.debug('device account(s):', accounts);

  const [{ address }] = accounts;

  /**
   * Query grants for granter / grantee pair
   *
   * For example, to check whether `delegateWalletAction()` is necessary.
   *
   * @param {string} granter address
   * @param {import('@cosmjs/tendermint-rpc').Tendermint34Client} rpcClient
   */
  const queryGrants = async (granter, rpcClient) => {
    const base = QueryClient.withExtensions(rpcClient);
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    console.log('query Grants', { granter, grantee: address });
    const result = await queryService.Grants({
      granter,
      grantee: address,
      msgTypeUrl: '', // wildcard
    });
    const decoded = result.grants.map(
      g =>
        g.authorization && GenericAuthorization.decode(g.authorization.value),
    );

    return decoded;
  };

  return harden({
    address,
    registry: SwingsetRegistry,
    wallet,
    queryGrants,
  });
};

/**
 * @param {string} granter bech32 address
 * @param {string} grantee bech32 address
 * @param {number} seconds expiration as seconds (Date.now() / 1000)
 */
const makeGrantWalletActionMessage = (granter, grantee, seconds) => {
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
 * TODO: test this, once we have a solution for cosmjs/issues/1155
 *
 * @param {string} granter bech32 address
 * @param {string} grantee bech32 address
 * @param {string} allowance number of uist (TODO: fix uist magic string denom)
 * @param {number} seconds expiration as seconds (Date.now() / 1000)
 */
const makeFeeGrantMessage = (granter, grantee, allowance, seconds) => {
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
 * @param {string} grantee
 * @param {EncodeObject[]} msgObjs
 * @param {import('@cosmjs/proto-signing').Registry} registry
 * @typedef {import('@cosmjs/proto-signing').EncodeObject} EncodeObject
 */
const makeExecMessage = (grantee, msgObjs, registry) => {
  const msgs = msgObjs.map(obj => ({
    typeUrl: obj.typeUrl,
    value: registry.encode(obj),
  }));
  return {
    typeUrl: CosmosMessages.authz.MsgExec.typeUrl,
    value: { grantee, msgs },
  };
};

/**
 * Make Exec messages for grantee to do WalletAction on behalf of granter
 *
 * @param {string} granter in the authz sense
 * @param {string} grantee in the authz sense
 * @param {string} action MsgWalletAction.action
 * @returns {EncodeObject[]}
 */
export const makeExecActionMessages = (granter, grantee, action) => {
  const act1 = {
    typeUrl: SwingsetMsgs.MsgWalletAction.typeUrl,
    value: {
      owner: toBase64(toAccAddress(granter)),
      action,
    },
  };
  const msgs = [makeExecMessage(grantee, [act1], SwingsetRegistry)];
  return msgs;
};

/**
 * Use Keplr to sign offers and delegate object messaging to local storage key.
 *
 * Ref: https://docs.keplr.app/api/
 *
 * @param {import('@keplr-wallet/types').ChainInfo} chainInfo
 * @param {NonNullable<KeplrWindow['keplr']>} keplr
 * @param {typeof import('@cosmjs/stargate').SigningStargateClient.connectWithSigner} connectWithSigner
 * @typedef {import('@keplr-wallet/types').Window} KeplrWindow
 */
export const makeInteractiveSigner = async (
  chainInfo,
  keplr,
  connectWithSigner,
) => {
  const { chainId } = chainInfo;

  const key = await keplr.getKey(chainId);

  const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
  console.log('OfferSigner', { offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;

  const converters = {
    ...SwingsetConverters,
    ...createBankAminoConverters(),
    ...createAuthzAminoConverters(),
  };
  const signingClient = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(converters),
    registry: SwingsetRegistry,
  });
  console.debug('OfferSigner', { signingClient });

  const fee = zeroFee();

  return harden({
    address, // TODO: address can change
    isNanoLedger: key.isNanoLedger,

    /**
     * TODO: integrate support for fee-account in MsgExec
     * https://github.com/cosmos/cosmjs/issues/1155
     * https://github.com/cosmos/cosmjs/pull/1159
     *
     * @param {string} grantee
     * @param {number} t0 current time (as from Date.now()) as basis for 4hr expiration
     */
    delegateWalletAction: async (grantee, t0) => {
      const expiration = t0 / 1000 + 4 * 60 * 60;
      // TODO: parameterize allowance?
      const allowance = '250000'; // 0.25 IST

      console.warn(
        'TODO: support for fee-account in MsgExec',
        makeFeeGrantMessage(address, grantee, allowance, expiration),
      );

      const feeGrantWorkAround = {
        typeUrl: CosmosMessages.bank.MsgSend.typeUrl,
        value: {
          fromAddress: address,
          toAddress: grantee,
          amount: [{ denom: 'ubld', amount: '25000' }],
        },
      };

      /** @type {EncodeObject[]} */
      const msgs = [
        // TODO: makeFeeGrantMessage(address, grantee, allowance, expiration),
        feeGrantWorkAround,
        makeGrantWalletActionMessage(address, grantee, expiration),
      ];

      console.log('sign Grant', { address, msgs, fee });
      const tx = await signingClient.signAndBroadcast(address, msgs, fee);
      console.log('Grant sign result tx', tx);
      assertIsDeliverTxSuccess(tx);

      return tx;
    },

    /**
     * Sign and broadcast WalletSpendAction
     *
     * @param {string} spendAction marshaled offer
     */
    submitSpendAction: async spendAction => {
      const { accountNumber, sequence } = await signingClient.getSequence(
        address,
      );
      console.log({ accountNumber, sequence });

      const act1 = {
        typeUrl: SwingsetMsgs.MsgWalletSpendAction.typeUrl,
        /** @type {WalletSpendAction} */
        value: {
          owner: toBase64(toAccAddress(address)),
          spendAction,
        },
      };

      const msgs = [act1];
      console.log('sign spend action', { address, msgs, fee });

      const tx = await signingClient.signAndBroadcast(address, msgs, fee);
      console.log('spend action result tx', tx);
      assertIsDeliverTxSuccess(tx);

      return tx;
    },
  });
};
