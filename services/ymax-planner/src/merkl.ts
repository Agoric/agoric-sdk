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
  { chainId, address }: { chainId: string; address: string },
): Promise<MerklRewardsInfo[]> =>
  client
    .get(`v4/users/${address}/rewards?chainId=${chainId}`)
    .json<MerklRewardsInfo[]>();
