import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';
import { Height } from 'cosmjs-types/ibc/core/client/v1/client';
import { getSigner } from './utils';
import {
  assertIsDeliverTxSuccess,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { tokens, urls } from './axelar/config';

type NobleForwardingMemo = {
  noble: {
    forwarding: {
      recipient: string;
      channel?: string; // Optional: defaults to reverse of incoming channel
    };
  };
};

// Create IBC transfer with forwarding memo
const nfaIbcPayload = (
  sourceChannel: string,
  senderAddress: string,
  nobleAddress: string,
  finalRecipient: string,
  destinationChannel?: string,
  amount = '1000000', // 1 BLD (6 decimals)
  denom = 'ubld',
) => {
  const memo: NobleForwardingMemo = {
    noble: {
      forwarding: {
        recipient: finalRecipient,
        ...(destinationChannel && { channel: destinationChannel }),
      },
    },
  };

  const transferMsg: MsgTransfer = {
    sourcePort: 'transfer',
    sourceChannel,
    token: {
      denom,
      amount,
    },
    sender: senderAddress,
    receiver: nobleAddress, // This becomes the forwarding account
    timeoutHeight: Height.fromPartial({
      revisionNumber: 0n,
      revisionHeight: 0n,
    }),
    timeoutTimestamp: BigInt(Date.now() * 1_000_000 + 3600 * 1_000_000_000), // 1 hour from now in nanoseconds
    memo: JSON.stringify(memo),
  };

  return {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
    value: transferMsg,
  };
};

const signer = await getSigner();

const accounts = await signer.getAccounts();
const senderAddress = accounts[0].address;
console.log('Sender Address:', senderAddress);

const ibcPayload = [
  nfaIbcPayload(
    'channel-11', // Source chain channel to Noble
    senderAddress, // Your address on source chain
    'noble1n4j0cy98dac5q6d9y5nhlmk5d6e4wzve0gznrw', // Noble address (will become forwarding account)
    senderAddress, // Final destination on Agoric
    'channel-337', // Noble channel to Agoric
  ),
];

console.log('Connecting with Signer...');
const signingClient = await SigningStargateClient.connectWithSigner(
  urls.RPC_AGORIC_DEVNET,
  signer,
);

const fee = {
  gas: '1000000',
  amount: [{ denom: tokens.nativeTokenAgoric, amount: '1000000' }],
};

console.log('Sign and Broadcast transaction...');
const response = await signingClient.signAndBroadcast(
  senderAddress,
  ibcPayload,
  fee,
);

console.log('Asserting', response);
