import { stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx.js';
import { Height } from 'cosmjs-types/ibc/core/client/v1/client.js';
import type { configs } from '../scripts/noble-usdn-lab.ts';

// https://github.com/noble-assets/forwarding/blob/main/proto/noble/forwarding/v1/packet.proto
type NobleForwardingMemo = {
  noble: {
    forwarding: {
      recipient: string;
      channel?: string; // Optional: defaults to reverse of incoming channel
      fallback?: string;
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

export const registerNobleForwardingAddress = async ({
  MNEMONIC,
  connectWithSigner,
  config,
  agoricDenom = 'ubld',
  dest,
}: {
  MNEMONIC: string;
  connectWithSigner: typeof SigningStargateClient.connectWithSigner;
  config: typeof configs.testnet;
  agoricDenom?: string;
  dest?: string;
}) => {
  const agWallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });

  const [{ address: senderAddress }] = await agWallet.getAccounts();
  dest ||= senderAddress;
  console.log('Sender, dest:', senderAddress, dest);

  const agToNoble = config.agoric.connections[config.noble.chainId];
  const ibcPayload = [
    nfaIbcPayload(
      agToNoble.transferChannel.channelId, // Source chain channel to Noble
      senderAddress, // Your address on source chain
      'noble1n4j0cy98dac5q6d9y5nhlmk5d6e4wzve0gznrw',
      dest, // Final destination on Agoric
      agToNoble.transferChannel.counterPartyChannelId, // Noble channel to Agoric
    ),
  ];

  console.log('Connecting with Signer...');

  const clientA = await connectWithSigner(config.agoric.rpc, agWallet);

  const fee = {
    gas: '1000000',
    amount: [{ denom: agoricDenom, amount: '1000000' }],
  };

  console.log('Sign and Broadcast transaction...');
  const response = await clientA.signAndBroadcast(
    senderAddress,
    ibcPayload,
    fee,
  );

  console.log('Asserting', response);
  return response;
};
