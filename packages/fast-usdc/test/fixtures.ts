import type { VTransferIBCEvent } from '@agoric/vats';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { CctpTxEvidence } from '../src/types.js';

const mockScenarios = [
  'AGORIC_PLUS_OSMO',
  'AGORIC_PLUS_DYDX',
  'AGORIC_NO_PARAMS',
  'AGORIC_UNKNOWN_EUD',
] as const;

type MockScenario = (typeof mockScenarios)[number];

export const MockCctpTxEvidences: Record<
  MockScenario,
  (receiverAddress?: string) => CctpTxEvidence
> = {
  AGORIC_PLUS_OSMO: (receiverAddress?: string) => ({
    blockHash:
      '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
    blockNumber: 21037663n,
    blockTimestamp: 1730762090n,
    txHash:
      '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
    tx: {
      amount: 150000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd',
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek?EUD=osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
    },
    chainId: 1,
  }),
  AGORIC_PLUS_DYDX: (receiverAddress?: string) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp: 1730762099n,
    txHash:
      '0xd81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 300000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelktz',
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek?EUD=dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
    },
    chainId: 1,
  }),
  AGORIC_NO_PARAMS: (receiverAddress?: string) => ({
    blockHash:
      '0x70d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp: 1730762099n,
    txHash:
      '0xa81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 200000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelyyy',
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek',
    },
    chainId: 1,
  }),
  AGORIC_UNKNOWN_EUD: (receiverAddress?: string) => ({
    blockHash:
      '0x70d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp: 1730762099n,
    txHash:
      '0xa81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 200000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelyyy',
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek?EUD=random1addr',
    },
    chainId: 1,
  }),
};

const nobleDefaultVTransferParams = {
  // (XXX confirm) FungibleTokenPacketData is from the perspective of the counterparty
  denom: 'uusdc',
  sourceChannel:
    fetchedChainInfo.agoric.connections['noble-1'].transferChannel
      .counterPartyChannelId,
  destinationChannel:
    fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
};

export const MockVTransferEvents: Record<
  MockScenario,
  (receiverAddress?: string) => VTransferIBCEvent
> = {
  AGORIC_PLUS_OSMO: (recieverAddress?: string) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.forwardingAddress,
      receiver:
        recieverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_OSMO().aux.recipientAddress,
    }),
  AGORIC_PLUS_DYDX: (recieverAddress?: string) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.forwardingAddress,
      receiver:
        recieverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_DYDX().aux.recipientAddress,
    }),
  AGORIC_NO_PARAMS: (recieverAddress?: string) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_NO_PARAMS().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_NO_PARAMS().tx.forwardingAddress,
      receiver:
        recieverAddress ||
        MockCctpTxEvidences.AGORIC_NO_PARAMS().aux.recipientAddress,
    }),
  AGORIC_UNKNOWN_EUD: (recieverAddress?: string) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().tx.forwardingAddress,
      receiver:
        recieverAddress ||
        MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().aux.recipientAddress,
    }),
};
