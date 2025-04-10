import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { Bech32Address, CosmosChainAddress } from '@agoric/orchestration';
import type { CctpTxEvidence, EvmAddress } from '../src/types.js';

const mockScenarios = [
  'AGORIC_PLUS_OSMO',
  'AGORIC_PLUS_DYDX',
  'AGORIC_PLUS_AGORIC',
  'AGORIC_NO_PARAMS',
  'AGORIC_UNKNOWN_EUD',
  'AGORIC_PLUS_ETHEREUM',
  'AGORIC_PLUS_NOBLE',
  'AGORIC_PLUS_NOBLE_B32EUD',
] as const;

export type MockScenario = (typeof mockScenarios)[number];

export const Senders = {
  default: '0xDefaultFakeEthereumAddress',
} as unknown as Record<string, EvmAddress>;

const blockTimestamp = 1632340000n;

export const MockCctpTxEvidences: Record<
  MockScenario,
  (receiverAddress?: Bech32Address) => CctpTxEvidence
> = {
  AGORIC_PLUS_OSMO: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
    blockNumber: 21037663n,
    blockTimestamp,
    txHash:
      '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
    tx: {
      amount: 150000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
        }),
    },
    chainId: 1,
  }),
  AGORIC_PLUS_DYDX: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp,
    txHash:
      '0xd81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 300000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelktz',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
        }),
    },
    chainId: 1,
  }),
  AGORIC_PLUS_AGORIC: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee6z9',
    blockNumber: 21037600n,
    blockTimestamp,
    txHash:
      '0xd81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617z9',
    tx: {
      amount: 250000000n,
      forwardingAddress: 'noble17ww3rfusv895d92c0ncgj0fl9trntn70jz7hd5',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2',
        }),
    },
    chainId: 1,
  }),
  AGORIC_NO_PARAMS: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x70d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp,
    txHash:
      '0xa81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 200000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelyyy',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress: receiverAddress || settlementAddress.value,
    },
    chainId: 1,
  }),
  AGORIC_UNKNOWN_EUD: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x70d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
    blockNumber: 21037669n,
    blockTimestamp,
    txHash:
      '0xa81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    tx: {
      amount: 200000000n,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelyyy',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'random1addr',
        }),
    },
    chainId: 1,
  }),
  AGORIC_PLUS_ETHEREUM: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee6z9',
    blockNumber: 21037600n,
    blockTimestamp,
    txHash:
      '0xe81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617z9',
    tx: {
      amount: 950000000n,
      forwardingAddress: 'noble17ww3rfusv895d92c0ncgj0fl9trntn70jz7ee5',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'eip155:1:0x1234567890123456789012345678901234567890',
        }),
    },
    chainId: 8453,
  }),
  AGORIC_PLUS_NOBLE: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee6z9',
    blockNumber: 21037600n,
    blockTimestamp,
    txHash:
      '0xe81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617z9',
    tx: {
      amount: 950000000n,
      forwardingAddress: 'noble17ww3rfusv895d92c0ncgj0fl9trntn70jz7ee5',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'cosmos:noble-1:noble1u2l9za2wa7wvffhtekgyuvyvum06lwhqxfyr5d',
        }),
    },
    chainId: 8453,
  }),
  /** Identical to AGORIC_PLUS_NOBLE, but the EUD is a bare bech32 */
  AGORIC_PLUS_NOBLE_B32EUD: (receiverAddress?: Bech32Address) => ({
    blockHash:
      '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee6z9',
    blockNumber: 21037600n,
    blockTimestamp,
    txHash:
      '0xe81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617z9',
    tx: {
      amount: 950000000n,
      forwardingAddress: 'noble17ww3rfusv895d92c0ncgj0fl9trntn70jz7ee5',
      sender: Senders.default,
    },
    aux: {
      forwardingChannel: 'channel-21',
      recipientAddress:
        receiverAddress ||
        encodeAddressHook(settlementAddress.value, {
          EUD: 'noble1u2l9za2wa7wvffhtekgyuvyvum06lwhqxfyr5d',
        }),
    },
    chainId: 8453,
  }),
};

export const settlementAddress: CosmosChainAddress = harden({
  chainId: 'agoric-3',
  encoding: 'bech32' as const,
  // Random value, copied from tests of address hooks
  value: 'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek',
});
