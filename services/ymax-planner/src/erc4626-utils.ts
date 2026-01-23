import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { Contract } from 'ethers';
import type { WebSocketProvider } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import { partialMap } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
import { getOwn } from './utils.ts';
import type { BalanceQueryPowers, ERC4626VaultQuery } from './plan-deposit.ts';

// Minimal ABI for ERC4626 vault interactions
const ERC4626_MINIMAL_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'convertToAssets',
    type: 'function',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

type ERC4626BalanceResult = {
  place: PoolKey;
  balance: bigint | undefined;
  error?: string;
};

/**
 * Fetch ERC4626 vault underlying asset balance using ethers provider.
 * @returns the count of underlying asset tokens (e.g., uusdc) represented by
 * the current balance as a count of currently held shares
 */
export const getERC4626VaultBalance = async (
  vaultAddress: string,
  userAddress: string,
  provider: WebSocketProvider,
): Promise<bigint> => {
  await null;

  // Create contract instance with minimal ABI
  const vault = new Contract(vaultAddress, ERC4626_MINIMAL_ABI, provider);

  try {
    // Step 1: Get vault token balance
    const vaultTokenBalance: bigint = await vault.balanceOf(userAddress);

    // If balance is 0, return 0 immediately
    if (vaultTokenBalance === 0n) {
      return 0n;
    }

    // Step 2: Convert vault tokens to underlying assets
    const underlyingAssetBalance: bigint =
      await vault.convertToAssets(vaultTokenBalance);

    return underlyingAssetBalance;
  } catch (cause) {
    throw Error(`Failed to fetch ERC4626 vault balance`, { cause });
  }
};

/**
 * Fetch ERC4626 vault balances using ethers provider.
 */
export const getERC4626VaultsBalances = async (
  queries: ERC4626VaultQuery[],
  powers: Pick<
    BalanceQueryPowers,
    'chainNameToChainIdMap' | 'erc4626VaultAddresses' | 'evmProviders'
  >,
): Promise<ERC4626BalanceResult[]> => {
  const { erc4626VaultAddresses, chainNameToChainIdMap, evmProviders } = powers;

  const missingPowers = partialMap(
    Object.entries({
      chainNameToChainIdMap,
      erc4626VaultAddresses,
      evmProviders,
    }),
    ([key, val]) => (val ? false : key),
  );
  missingPowers.length === 0 ||
    Fail`ERC4626 vault queries missing powers: ${q(missingPowers)}`;

  return Promise.all(
    queries.map(async ({ place, chainName, address }) => {
      await null;
      try {
        const vaultAddress =
          getOwn(erc4626VaultAddresses, place) ||
          Fail`No vault configuration for instrument ${q(place)}`;

        const chainId: CaipChainId = chainNameToChainIdMap[chainName];
        const provider = evmProviders[chainId];
        if (!provider) {
          throw Error(`No provider found for chain: ${chainId}`);
        }
        const balance = await getERC4626VaultBalance(
          vaultAddress,
          address,
          provider,
        );
        return { place, balance } as ERC4626BalanceResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          place,
          balance: undefined,
          error: `Could not get ERC4626 balance: ${message}`,
        } as ERC4626BalanceResult;
      }
    }),
  );
};
