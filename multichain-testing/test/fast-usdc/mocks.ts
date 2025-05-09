import type { Bech32Address } from '@agoric/cosmic-proto/address-hooks.js';
import type {
  NobleAddress,
  EvmAddress,
  CctpTxEvidence,
} from '@agoric/fast-usdc';

import chainInfo from '@agoric/orchestration/src/cctp-chain-info.js';

export const prepareCctpTxEvidence = (
  nobleAgoricChannelId: string,
  baseCallCount = 0,
) => {
  let callCount = baseCallCount;
  const fakeCctpTxEvidence = (
    mintAmt: bigint,
    userForwardingAddr: NobleAddress,
    recipientAddress: Bech32Address,
  ) =>
    harden({
      // NB block info can never be the same between transactions but we leave them fixed
      // to make it easier to string search if necessary. None of the test logic depends on them.
      blockHash:
        '0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee665',
      blockNumber: 21037663n,
      blockTimestamp: 1632340000n,
      // Standard prefix to make it easier to find this code from logs
      // but add `callCount` so it is unique per test.
      txHash: `0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff3875527617${String(callCount++).padStart(2, '0')}`,
      tx: {
        amount: mintAmt,
        forwardingAddress: userForwardingAddr,
        // Fake sender address for testing purposes
        sender: '0x9a9eE9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9' as EvmAddress,
      },
      aux: {
        forwardingChannel: nobleAgoricChannelId,
        recipientAddress,
      },
      chainId: Number(chainInfo.arbitrum.reference),
    }) as CctpTxEvidence;
  return fakeCctpTxEvidence;
};
