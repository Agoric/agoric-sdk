import type {
  OfferSpec,
  OfferStatus,
} from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type {
  DeliverTxResponse,
  SignerData,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import type { EReturn } from '@endo/far';
import { MsgWalletSpendAction } from './codegen/agoric/swingset/msgs.js';
import { TxRaw } from './codegen/cosmos/tx/v1beta1/tx.js';
import { makeStargateClientKit } from './signing-client.js';
import { type SmartWalletKit } from './smart-wallet-kit.js';

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
    await sendBridgeAction(
      harden({
        method: 'executeOffer',
        offer,
      }),
    );

    return offerP;
  };

  return Object.freeze({
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
