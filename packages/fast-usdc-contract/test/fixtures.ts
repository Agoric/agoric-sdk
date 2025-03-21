import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { CosmosChainAddress } from '@agoric/orchestration';
import type { VTransferIBCEvent } from '@agoric/vats';
import type {
  CctpTxEvidence,
  EvmAddress,
} from '@agoric/fast-usdc/src/types.js';
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
  AGORIC_PLUS_AGORIC: (recieverAddress?: string) =>
    buildVTransferEvent({
      ...nobleDefaultVTransferParams,
      amount: MockCctpTxEvidences.AGORIC_PLUS_AGORIC().tx.amount,
      sender: MockCctpTxEvidences.AGORIC_PLUS_AGORIC().tx.forwardingAddress,
      receiver:
        recieverAddress ||
        MockCctpTxEvidences.AGORIC_PLUS_AGORIC().aux.recipientAddress,
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

export const intermediateRecipient: CosmosChainAddress = harden({
  chainId: 'noble-1',
  value: 'noble1test',
  encoding: 'bech32',
});
