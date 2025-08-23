import type {
  InvokeEntryMessage,
  OfferSpec,
} from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { SigningStargateClient, StdFee } from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import type { EReturn } from '@endo/far';
import { MsgWalletSpendAction } from './codegen/agoric/swingset/msgs.js';
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

  const query = {
    readPublished: walletUtils.readPublished,
    vstorage: walletUtils.vstorage,
    getLastUpdate: () => walletUtils.getLastUpdate(address),
    getCurrentWalletRecord: () => walletUtils.getCurrentWalletRecord(address),
    pollOffer: (
      ...args: Parameters<SmartWalletKit['pollOffer']> extends [
        any,
        ...infer Rest,
      ]
        ? Rest
        : never
    ) => walletUtils.pollOffer(address, ...args),
  };

  const sendBridgeAction = (action: BridgeAction) => {
    const msgSpend = MsgWalletSpendAction.fromPartial({
      owner: toAccAddress(address),
      spendAction: JSON.stringify(walletUtils.marshaller.toCapData(action)),
    });

    return client.signAndBroadcast(
      address,
      [{ typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend }],
      defaultFee,
    );
  };

  const executeOffer = async (offer: OfferSpec) => {
    const before = await client.getBlock();

    await sendBridgeAction(
      harden({
        method: 'executeOffer',
        offer,
      }),
    );

    return walletUtils.pollOffer(address, offer.id, before.header.height);
  };

  const invokeEntry = async (message: InvokeEntryMessage) => {
    const transaction = await sendBridgeAction(
      harden({
        method: 'invokeEntry',
        message,
      }),
    );

    return { result: { transaction } };
  };

  return Object.freeze({
    networkConfig: walletUtils.networkConfig,
    marshaller: walletUtils.marshaller,
    query,
    address,
    executeOffer,
    invokeEntry,
    sendBridgeAction,
  });
};
export type SigningSmartWalletKit = EReturn<typeof makeSigningSmartWalletKit>;
