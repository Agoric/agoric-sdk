import type { KyInstance } from 'ky';

/** https://docs.morpho.org/developers/rewards/tutorials/claim-rewards/ */
type MerklRewardsInfo = {
  chain: { id: number; name: string };
  rewards: Array<{
    token: { address: `0x${string}`; symbol: string; decimals: number };
    amount: `${bigint}`;
    claimed: `${bigint}`;
    proofs: `0x${string}`[];
  }>;
};

/**
 * Fetch Merkl rewards info.
 * @see https://docs.morpho.org/developers/rewards/tutorials/claim-rewards/
 */
export const fetchMerklRewardsInfo = (
  client: KyInstance,
  { chainId, address }: { chainId: `${bigint}`; address: `0x${string}` },
): Promise<MerklRewardsInfo[]> => {
  if (!chainId.match(/^(?:0|[1-9][0-9]*)$/)) {
    throw Error('chainId must be a decimal integer string');
  }
  if (!address.match(/^0x(?:[0-9a-fA-F]{2})+$/)) {
    throw Error('address must be 0x-prefixed hexadecimal');
  }
  return client
    .get(`v4/users/${address}/rewards?chainId=${chainId}`)
    .json<MerklRewardsInfo[]>();
};
