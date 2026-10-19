import type {
  OfferSpec,
  OfferStatus,
} from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type {
  DeliverTxResponse,
  GasPrice,
  SignerData,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { calculateFee } from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import type { EReturn } from '@endo/far';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { makeStargateClientKit } from './signing-client.js';
import { minGasPrices, type AgoricGasPrices } from './signing-fees.js';
import type { SmartWalletKit } from './smart-wallet-kit.js';

export type BroadcastFee = StdFee | 'auto' | number;

/**
 * Augment a read-only SmartWalletKit with signing ability
 * @alpha
 */
export const makeSigningSmartWalletKitFromClient = async ({
  smartWalletKit: walletUtils,
  address,
  client,
  gasPrice,
  gasAdjustment = 1.2,
}: {
  smartWalletKit: SmartWalletKit;
  address: string;
  client: SigningStargateClient;
  gasPrice?: GasPrice;
  gasAdjustment?: number;
}) => {
  type PollOfferWithoutAddressArgs = [
    id: Parameters<SmartWalletKit['pollOffer']>[1],
    minHeight?: Parameters<SmartWalletKit['pollOffer']>[2],
    untilNumWantsSatisfied?: Parameters<SmartWalletKit['pollOffer']>[3],
  ];

  // Omit deprecated utilities
  const { storedWalletState: _, ...swk } = walletUtils;

  const query = {
    readPublished: swk.readPublished,
    vstorage: swk.vstorage,
    getLastUpdate: () => swk.getLastUpdate(address),
    getCurrentWalletRecord: () => swk.getCurrentWalletRecord(address),
    pollOffer: (...args: PollOfferWithoutAddressArgs) =>
      swk.pollOffer(address, ...args),
  };

  const sendBridgeAction = async (
    action: BridgeAction,
    fee: BroadcastFee = 'auto',
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

    const needsAutoFee = fee === 'auto' || typeof fee === 'number';
    if (needsAutoFee) {
      if (!gasPrice) {
        throw Error(
          'manual signing with fee "auto" requires a resolved GasPrice',
        );
      }
    }
    const gas = await (needsAutoFee
      ? client.simulate(address, messages, memo)
      : Promise.resolve(undefined));

    let signingFee: StdFee;
    if (needsAutoFee) {
      if (!gasPrice || gas === undefined) {
        throw Error('manual signing fee simulation did not resolve');
      }
      const adjustment = fee === 'auto' ? gasAdjustment : fee;
      signingFee = calculateFee(Math.ceil(gas * adjustment), gasPrice);
    } else {
      signingFee = fee;
    }

    // Explicit signing data
    const signedTx = await client.sign(
      address,
      messages,
      signingFee,
      memo,
      signerData,
    );

    const txBytes = TxRaw.encode(signedTx).finish();
    return client.broadcastTx(txBytes);
  };

  const executeOffer = async (
    offer: OfferSpec,
    fee?: BroadcastFee,
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
    gasPrices = minGasPrices,
    feeDenom,
    gasAdjustment,
  }: {
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
    walletUtils: SmartWalletKit;
    gasPrices?: AgoricGasPrices;
    feeDenom?: string;
    gasAdjustment?: number;
  },
  MNEMONIC: string,
) => {
  const { address, client, gasPrice } = await makeStargateClientKit(MNEMONIC, {
    connectWithSigner,
    // XXX always the first
    rpcAddr: walletUtils.networkConfig.rpcAddrs[0],
    gasPrices,
    feeDenom,
  });
  return makeSigningSmartWalletKitFromClient({
    smartWalletKit: walletUtils,
    address,
    client,
    gasPrice,
    gasAdjustment,
  });
};
harden(makeSigningSmartWalletKit);
export type SigningSmartWalletKit = EReturn<typeof makeSigningSmartWalletKit>;
export type { SmartWalletKit };
