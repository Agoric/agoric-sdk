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
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { makeStargateClientKit } from './signing-client.js';
import type { SmartWalletKit } from './smart-wallet-kit.js';

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
