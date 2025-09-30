import type {
  OfferSpec,
  OfferStatus,
} from '@agoric/smart-wallet/src/offers.js';
import type {
  BridgeAction,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { EMethods } from '@agoric/vow/src/E.js';
import type { Instance } from '@agoric/zoe';
import type {
  DeliverTxResponse,
  SignerData,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { Fail, q } from '@endo/errors';
import type { EReturn } from '@endo/far';
import { MsgWalletSpendAction } from './codegen/agoric/swingset/msgs.js';
import { TxRaw } from './codegen/cosmos/tx/v1beta1/tx.js';
import { makeStargateClientKit } from './signing-client.js';
import type { SmartWalletKit } from './smart-wallet-kit.js';
import { retryUntilCondition } from './sync-tools.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';

type TxOptions = RetryOptionsAndPowers & {
  immediate?: boolean;
  makeNonce?: () => string;
};

// TODO parameterize as part of https://github.com/Agoric/agoric-sdk/issues/5912
const defaultFee: StdFee = {
  amount: [{ denom: 'ubld', amount: '500000' }], // XXX enough?
  gas: '19700000',
};

/**
 * Augment a read-only SmartWalletKit with signing ability
 */
export const makeSigningSmartWalletKit = async (
  {
    connectWithSigner,
    walletUtils,
  }: {
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
    walletUtils: SmartWalletKit;
  },
  MNEMONIC: string,
) => {
  const { address, client } = await makeStargateClientKit(MNEMONIC, {
    connectWithSigner,
    // XXX always the first
    rpcAddr: walletUtils.networkConfig.rpcAddrs[0],
  });

  // Omit deprecated utilities
  const { storedWalletState: _, ...swk } = walletUtils;

  const query = {
    readPublished: swk.readPublished,
    vstorage: swk.vstorage,
    getLastUpdate: () => swk.getLastUpdate(address),
    getCurrentWalletRecord: () => swk.getCurrentWalletRecord(address),
    pollOffer: (
      ...args: Parameters<SmartWalletKit['pollOffer']> extends [
        any,
        ...infer Rest,
      ]
        ? Rest
        : never
    ) => swk.pollOffer(address, ...args),
  };

  const sendBridgeAction = async (
    action: BridgeAction,
    fee: StdFee = defaultFee,
    memo: string = '',
    signerData?: SignerData,
  ): Promise<DeliverTxResponse> => {
    // The caller should do this but it's more ergonomic to allow an object
    // literal, and in that case this hardening does not create an external
    // side-effect.
    harden(action);

    const msgSpend = MsgWalletSpendAction.fromPartial({
      owner: toAccAddress(address),
      spendAction: JSON.stringify(swk.marshaller.toCapData(action)),
    });

    const messages = [
      { typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend },
    ];

    if (!signerData) {
      return client.signAndBroadcast(address, messages, fee, memo);
    }

    // Explicit signing data
    const signedTx = await client.sign(
      address,
      messages,
      fee,
      memo,
      signerData,
    );

    const txBytes = TxRaw.encode(signedTx).finish();
    return client.broadcastTx(txBytes);
  };

  const executeOffer = async (offer: OfferSpec): Promise<OfferStatus> => {
    const offerP = swk.pollOffer(address, offer.id);

    // Await for rejection handling
    await sendBridgeAction({
      method: 'executeOffer',
      offer,
    });

    return offerP;
  };

  return harden({
    ...swk,
    query,
    address,
    /**
     * Send an `executeOffer` bridge action and promise the resulting offer
     * record once the offer has settled. If you don't need the offer record,
     * consider using `sendBridgeAction` instead.
     */
    executeOffer,
    sendBridgeAction,
  });
};
export type SigningSmartWalletKit = EReturn<typeof makeSigningSmartWalletKit>;

/**
 * @alpha
 */
export const reflectWalletStore = (
  sswk: SigningSmartWalletKit,
  baseTxOpts?: Partial<TxOptions>,
) => {
  baseTxOpts = { log: () => {}, ...baseTxOpts };

  const makeEntryProxy = (
    targetName: string,
    overrides?: Partial<TxOptions>,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...overrides } as TxOptions;
    combinedOpts.setTimeout || Fail`missing setTimeout`;
    const { immediate, makeNonce, ...retryOpts } = combinedOpts;
    const { log = () => {} } = combinedOpts;
    const logged = <T>(label: string, x: T): T => {
      log(label, x);
      return x;
    };
    return new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        method !== 'then' || Fail`unsupported method name "then"`;
        const boundMethod = async (...args) => {
          const id = makeNonce ? `${method}.${makeNonce()}` : undefined;
          const message = logged('invoke', {
            id,
            targetName,
            method,
            args,
            // ...(saveResult ? { saveResult } : {}),
          });
          const tx = await sswk.sendBridgeAction({
            method: 'invokeEntry',
            message,
          });
          if (tx.code !== 0) {
            throw Error(tx.rawLog);
          }
          if (!immediate && id) {
            const done = (await retryUntilCondition(
              sswk.query.getLastUpdate,
              update =>
                update.updated === 'invocation' &&
                update.id === id &&
                !!(update.result || update.error),
              `${id}`,
              retryOpts,
            )) as UpdateRecord & { updated: 'invocation' };
            if (done.error) throw Error(done.error);
          }
          // return saveResult ? makeEntryProxy(saveResult.name) : undefined;
          return { id, tx };
        };
        return harden(boundMethod);
      },
    });
  };

  const saveOfferResult = async (
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
    options?: Partial<TxOptions & { overwrite: boolean }>,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...options } as TxOptions & {
      overwrite?: boolean;
    };
    const {
      immediate: _immediate,
      makeNonce,
      overwrite = true,
      ...retryOpts
    } = combinedOpts;
    if (!makeNonce) throw Fail`missing makeNonce`;
    const id = `${description}.${makeNonce()}`;
    const tx = await sswk.sendBridgeAction({
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: { source: 'purse', instance, description },
        proposal: {},
        saveResult: { name, overwrite },
      },
    });
    // await up.offerResult(id);
    const done = (await retryUntilCondition(
      sswk.query.getLastUpdate,
      // "walletAction" indicates an error, "offerStatus" with the right id and
      // either `result` or `error` indicates settlement.
      update =>
        update.updated === 'walletAction' ||
        (update.updated === 'offerStatus' &&
          update.status.id === id &&
          !!(update.status.result || update.status.error)),
      `${id}`,
      retryOpts,
    )) as UpdateRecord & { updated: 'walletAction' | 'offerStatus' };
    if (done.updated !== 'offerStatus') {
      throw Fail`${q(id)} ${q(done.updated)} failure: ${q(done.status?.error)}`;
    }
    const { error, result } = done.status;
    !error || Fail`${q(id)} offerStatus failure: ${q(error)}`;
    result || Fail`${q(id)} offerStatus missing result`;
    return { id, tx, result };
  };

  return harden({
    /**
     * Return a previously-saved result as a remote object with type-aware
     * methods that map to "invokeEntry" submissions. The methods will always
     * await tx output from `sendBridgeAction`, and will also wait for
     * confirmation in vstorage when sent with an `id` (e.g., derived from a
     * `makeNonce` option) unless overridden by an `immediate: true` option.
     */
    get: <T>(name: string, options?: Partial<TxOptions>) =>
      makeEntryProxy(name, options) as EMethods<T>,
    /**
     * Execute the offer specified by { instance, description } and save the
     * result in the wallet store with the specified name (default to match the
     * offer description), overwriting any prior entry for that name unless
     * otherwise specified. Waits for confirmation in vstorage before returning.
     */
    saveOfferResult,
  });
};
