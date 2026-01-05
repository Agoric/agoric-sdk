import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { Contract } from 'ethers';
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
 * Queries the vault token balance, then converts it to underlying assets using convertToAssets.
 */
export const getERC4626VaultBalance = async (
  vaultAddress: string,
  userAddress: string,
  chainId: string,
  evmProviders: NonNullable<BalanceQueryPowers['evmCtx']>['evmProviders'],
): Promise<bigint> => {
  await null;
  const provider = evmProviders[chainId as keyof typeof evmProviders];
  if (!provider) {
    throw Error(`No provider found for chain: ${chainId}`);
  }

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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw Error(`Failed to fetch ERC4626 vault balance: ${errorMsg}`);
  }
};

/**
 * Fetch ERC4626 vault balances using ethers provider.
 * Similar interface to spectrumPools.getBalances for consistency.
 */
export const getERC4626VaultsBalances = async (
  queries: ERC4626VaultQuery[],
  powers: BalanceQueryPowers,
  errors: Error[],
): Promise<ERC4626BalanceResult[]> => {
  const { erc4626Vaults, evmCtx } = powers;

  if (!erc4626Vaults) {
    const err = 'ERC4626 vault configurations are required';
    errors.push(Error(err));
    return queries.map(query => ({
      place: query.place,
      balance: undefined,
      error: err,
    }));
  }

  if (!evmCtx || !evmCtx.evmProviders) {
    const err =
      'EVM context with providers is required for ERC4626 vault queries';
    errors.push(Error(err));
    return queries.map(query => ({
      place: query.place,
      balance: undefined,
      error: err,
    }));
  }

  return Promise.all(
    queries.map(async (query): Promise<ERC4626BalanceResult> => {
      await null;
      const { place, chainName, address } = query;
      try {
        const vaultAddress = getOwn(erc4626Vaults, place);
        if (!vaultAddress) {
          const err = `No vault configuration for ERC4626 instrument: ${place}`;
          return { place, balance: undefined, error: err };
        }

        const balance = await getERC4626VaultBalance(
          vaultAddress,
          address,
          chainName,
          evmCtx.evmProviders,
        );

        return { place, balance };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          place,
          balance: undefined,
          error: `Could not get ERC4626 balance: ${errorMsg}`,
        };
      }
    }),
  );
};
