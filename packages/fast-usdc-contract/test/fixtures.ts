import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { Bech32Address, CosmosChainAddress } from '@agoric/orchestration';
import type { VTransferIBCEvent } from '@agoric/vats';
import {
  MockCctpTxEvidences,
  type MockScenario,
} from '@agoric/fast-usdc/tools/mock-evidence.js';

export { MockCctpTxEvidences };

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
  (receiverAddress?: Bech32Address) => VTransferIBCEvent
> = {
  AGORIC_PLUS_OSMO: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_OSMO().aux.recipientAddress,
    }),
  AGORIC_PLUS_DYDX: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_DYDX().aux.recipientAddress,
    }),
  AGORIC_PLUS_AGORIC: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_AGORIC().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_AGORIC().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_AGORIC().aux.recipientAddress,
    }),
  AGORIC_NO_PARAMS: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_NO_PARAMS().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_NO_PARAMS().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_NO_PARAMS().aux.recipientAddress,
    }),
  AGORIC_UNKNOWN_EUD: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_UNKNOWN_EUD().aux.recipientAddress,
    }),

  AGORIC_PLUS_ETHEREUM: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().aux.recipientAddress,
    }),
  AGORIC_PLUS_NOBLE: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_NOBLE().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_NOBLE().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_NOBLE().aux.recipientAddress,
    }),
  AGORIC_PLUS_NOBLE_B32EUD: (receiverAddress?: Bech32Address) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_NOBLE_B32EUD().tx.amount,
      sender:
        MockCctpTxEvidences.AGORIC_PLUS_NOBLE_B32EUD().tx.forwardingAddress,
      receiver:
        receiverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_NOBLE_B32EUD().aux.recipientAddress,
    }),
};

export const intermediateRecipient: CosmosChainAddress = harden({
  chainId: 'noble-1',
  value: 'noble1test',
  encoding: 'bech32',
});
