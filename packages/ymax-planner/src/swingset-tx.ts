import type { SmartWalletKit } from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { makeTracer } from '@agoric/internal';
import type { OfferId } from '@agoric/smart-wallet/src/offers';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { fromBech32 } from '@cosmjs/encoding';
import {
  SigningStargateClient,
  type Block,
  type StdFee,
} from '@cosmjs/stargate';
import { Fail } from '@endo/errors';

const toAccAddress = (address: string): Uint8Array => {
  return fromBech32(address).data;
};

const trace = makeTracer('Swingset Tx Tools');

const pollOffer = async (
  offerId: OfferId,
  before: Block,
  {
    address,
    walletKit,
  }: {
    address: string;
    walletKit: SmartWalletKit;
  },
) => {
  trace(
    'starting to poll for offer result from block height',
    before.header.height,
  );
  const status = await walletKit.pollOffer(
    address,
    offerId,
    before.header.height,
  );

  trace('final offer status', status);
  if ('error' in status) {
    trace('offer failed with error', status.error);
    throw Error(status.error);
  }
  trace('offer completed successfully', {
    statusType: 'success',
    result: status.result,
  });

  return status;
};

export const submitAction = async (
  action: BridgeAction,
  {
    address,
    stargateClient,
    walletKit,
    skipPoll = false,
  }: {
    address: string;
    stargateClient: SigningStargateClient;
    walletKit: SmartWalletKit;
    skipPoll?: boolean;
  },
) => {
  const msgSpend = MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(address),
    spendAction: JSON.stringify(walletKit.marshaller.toCapData(action)),
  });

  const fee: StdFee = {
    amount: [{ denom: 'ubld', amount: '30000' }], // XXX enough?
    gas: '197000',
  };
  const before = await stargateClient.getBlock();
  console.log('signAndBroadcast', address, msgSpend, fee);
  const actual = await stargateClient.signAndBroadcast(
    address,
    [{ typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend }],
    fee,
  );
  trace('tx', actual);

  if (skipPoll) {
    trace('skipping poll as per skipPoll flag');
    const status = { result: { transaction: actual } };
    return status;
  }

  switch (action.method) {
    case 'executeOffer':
      return pollOffer(action.offer.id, before, { walletKit, address });
    case 'tryExitOffer':
      return pollOffer(action.offerId, before, { walletKit, address });
    default:
      throw Fail`Unable to poll status for offer type ${action.method}`;
  }
};
