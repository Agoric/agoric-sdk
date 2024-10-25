export type Hex = `0x${string}`; // as in viem
export type NobleAddress = `noble1${string}`;
export type IBCChannelID = `channel-${number}`;

export type CCTPTxEvidence = {
  txHash: Hex;
  /** data covered by signature (aka txHash) */
  tx: {
    amount: bigint;
    forwardingAddress: NobleAddress;
  };
  blockHash: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint; // seconds since the epoch
  /** from Noble RPC */
  aux: {
    forwardingChannel: IBCChannelID;
    recipientAddress: string;
  };
};
