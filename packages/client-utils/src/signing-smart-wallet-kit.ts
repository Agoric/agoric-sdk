import type {
  OfferSpec,
  OfferStatus,
} from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { ECallable } from '@agoric/vow/src/E.js';
import type { EUnwrap } from '@agoric/vow/src/types.js';
import type { Instance } from '@agoric/zoe';
import type {
  DeliverTxResponse,
  SignerData,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { Fail } from '@endo/errors';
import type { EReturn } from '@endo/far';
import { MsgWalletSpendAction } from './codegen/agoric/swingset/msgs.js';
import { TxRaw } from './codegen/cosmos/tx/v1beta1/tx.js';
import { makeStargateClientKit } from './signing-client.js';
import { getInvocationUpdate, getOfferResult } from './smart-wallet-kit.js';
import type { SmartWalletKit } from './smart-wallet-kit.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';

type TxOptions = RetryOptionsAndPowers & {
  fee?: StdFee;
  sendOnly?: boolean;
  makeNonce?: () => string;
};

/**
 * A type-aware representation of an object saved in the wallet store, with
 * methods that return information about their implementing "invokeEntry"
 * submissions. If Recursive is true, then each method has an initial
 * { name?: string, overwrite?: boolean } parameter for specifying how (or if)
 * to save results back into the wallet store and responses for such saved
 * results also include a WalletStoreEntryProxy `result` representing those
 * results.
 */
type WalletStoreEntryProxy<T, Recursive extends true | false = false> = {
  readonly [M in keyof T]: T[M] extends (...args: infer P) => infer R
    ? Recursive extends false
      ? ECallable<(...args: P) => { id?: string; tx: DeliverTxResponse }>
      : ECallable<
          <SaveToName extends string | undefined>(
            options: SaveToName extends string
              ? { name: SaveToName; overwrite?: boolean }
              : undefined | Record<PropertyKey, never>,
            ...args: P
          ) => {
            id?: string;
            tx: DeliverTxResponse;
            result: SaveToName extends string
              ? WalletStoreEntryProxy<EUnwrap<R>, true>
              : undefined;
          }
        >
    : never;
};

/**
 * A reasonable default fee for transactions consisting of a single
 * WalletSpendAction message.
 */
const defaultFee: StdFee = {
  // As of 2025-11, even a large isolated spend action transaction consumes
  // less than 200_000 gas units, so 400_000 includes a fudge factor of over 2x.
  gas: '400000',
  // As of 2025-11, validators seem to still be using the Agoric
  // `minimum-gas-prices` recommendation of 0.01ubld per gas unit:
  // https://community.agoric.com/t/network-change-instituting-fees-on-the-agoric-chain-to-mitigate-spam-transactions/109/2
  // So 10_000 ubld = 0.01 BLD includes a fudge factor of over 2x.
  amount: [{ denom: 'ubld', amount: '10000' }],
};

/**
 * Augment a read-only SmartWalletKit with signing ability
 * @alpha
 */
export const makeSigningSmartWalletKitFromClient = async ({
  smartWalletKit: walletUtils,
  address,
  client,
}: {
  smartWalletKit: SmartWalletKit;
  address: string;
  client: SigningStargateClient;
}) => {
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

  const executeOffer = async (
    offer: OfferSpec,
    fee?: StdFee,
    memo?: string,
    signerData?: SignerData,
  ): Promise<OfferStatus> => {
    const offerP = swk.pollOffer(address, offer.id);

    // Await for rejection handling
    await sendBridgeAction(
      { method: 'executeOffer', offer },
      fee,
      memo,
      signerData,
    );

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
harden(makeSigningSmartWalletKitFromClient);

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
  return makeSigningSmartWalletKitFromClient({
    smartWalletKit: walletUtils,
    address,
    client,
  });
};
harden(makeSigningSmartWalletKit);
export type SigningSmartWalletKit = EReturn<typeof makeSigningSmartWalletKit>;
export type { SmartWalletKit };

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
    forSavingResults?: boolean,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...overrides } as TxOptions;
    combinedOpts.setTimeout || Fail`missing setTimeout`;
    const { fee, sendOnly, makeNonce, ...retryOpts } = combinedOpts;
    if (forSavingResults && !makeNonce && !sendOnly) {
      throw Fail`makeNonce is required without sendOnly: true (to create an awaitable message id)`;
    }
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
          const options = forSavingResults ? args.shift() : {};
          const { name, overwrite = true } = options;
          const saveResult =
            forSavingResults && name ? { name, overwrite } : undefined;
          const id = makeNonce ? `${method}.${makeNonce()}` : undefined;
          const message = logged('invoke', {
            id,
            targetName,
            method,
            args,
            ...(saveResult ? { saveResult } : undefined),
          });
          const tx = await sswk.sendBridgeAction(
            { method: 'invokeEntry', message },
            fee,
          );
          if (tx.code !== 0) {
            throw Error(tx.rawLog);
          }
          if (!sendOnly && id) {
            await getInvocationUpdate(id, sswk.query.getLastUpdate, retryOpts);
          }
          const ret = { id, tx };
          if (forSavingResults) {
            const result = name
              ? makeEntryProxy(name, overrides, forSavingResults)
              : undefined;
            return { ...ret, result };
          }
          return ret;
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
      fee,
      sendOnly: _sendOnly,
      makeNonce,
      overwrite = true,
      ...retryOpts
    } = combinedOpts;
    if (!makeNonce) throw Fail`missing makeNonce`;
    const id = `${description}.${makeNonce()}`;
    const offer: OfferSpec = {
      id,
      invitationSpec: { source: 'purse', instance, description },
      proposal: {},
      saveResult: { name, overwrite },
    };
    const tx = await sswk.sendBridgeAction(
      { method: 'executeOffer', offer },
      fee,
    );
    const status = await getOfferResult(
      id,
      sswk.query.getLastUpdate,
      retryOpts,
    );
    return { id, tx, result: status.result };
  };

  return harden({
    /**
     * Return a previously-saved result as a remote object with type-aware
     * methods that map to "invokeEntry" submissions. The methods will always
     * await tx output from `sendBridgeAction`, and will also wait for
     * confirmation in vstorage when sent with an `id` (e.g., derived from a
     * `makeNonce` option) unless overridden by a `sendOnly: true` option.
     */
    get: <T>(name: string, options?: Partial<TxOptions>) =>
      makeEntryProxy(name, options, false) as WalletStoreEntryProxy<T, false>,
    /**
     * Return a previously-saved result as a remote object with type-aware
     * methods that map to "invokeEntry" submissions, each having an additional
     * initial { name?: string, overwrite?: boolean } parameter for specifying
     * how (or if) to save results in the wallet store. The methods will always
     * await tx output from `sendBridgeAction`, and will also wait for
     * confirmation in vstorage unless overridden by a `sendOnly: true` option
     * (but note that when so overridden, the returned `result` is not yet
     * usable).
     */
    getForSavingResults: <T>(name: string, options?: Partial<TxOptions>) =>
      makeEntryProxy(name, options, true) as WalletStoreEntryProxy<T, true>,
    /**
     * Execute the offer specified by { instance, description } and save the
     * result in the wallet store with the specified name (default to match the
     * offer description), overwriting any prior entry for that name unless
     * otherwise specified. Waits for confirmation in vstorage before returning.
     */
    saveOfferResult,
  });
};
