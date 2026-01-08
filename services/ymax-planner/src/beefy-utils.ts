import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { Contract } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import { getOwn } from './utils.ts';
import type { BalanceQueryPowers, BeefyVaultQuery } from './plan-deposit.ts';

// Minimal ABI for Beefy vault interactions
const BEEFY_VAULT_MINIMAL_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'balance',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

type BeefyBalanceResult = {
  place: PoolKey;
  balance: bigint | undefined;
  error?: string;
};

/**
 * Fetch Beefy vault underlying asset balance using ethers provider.
 * Queries the vault token balance, then calculates underlying assets using totalSupply and vault balance.
 */
export const getBeefyVaultBalance = async (
  vaultAddress: string,
  userAddress: string,
  chainId: CaipChainId,
  evmProviders: NonNullable<BalanceQueryPowers['evmCtx']>['evmProviders'],
): Promise<bigint> => {
  await null;
  const provider = evmProviders[chainId as keyof typeof evmProviders];
  if (!provider) {
    throw Error(`No provider found for chain: ${chainId}`);
  }

  const vault = new Contract(vaultAddress, BEEFY_VAULT_MINIMAL_ABI, provider);

  try {
    const vaultTokenBalance: bigint = await vault.balanceOf(userAddress);

    if (vaultTokenBalance === 0n) {
      return 0n;
    }

    const totalSupply: bigint = await vault.totalSupply();
    if (totalSupply === 0n) {
      throw Error('Vault has zero total supply');
    }

    const vaultUnderlyingBalance: bigint = await vault.balance();

    const underlyingAssetBalance =
      (vaultTokenBalance * vaultUnderlyingBalance -
        vaultUnderlyingBalance +
        1n) /
      totalSupply;
    //   (vaultTokenBalance * vaultUnderlyingBalance) / totalSupply;

    return underlyingAssetBalance;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw Error(`Failed to fetch Beefy vault balance: ${errorMsg}`);
  }
};

/**
 * Fetch Beefy vault balances using ethers provider.
 * Similar interface to spectrumPools.getBalances for consistency.
 */
export const getBeefyVaultsBalances = async (
  queries: BeefyVaultQuery[],
  powers: BalanceQueryPowers,
): Promise<BeefyBalanceResult[]> => {
  const { vaults, evmCtx } = powers;

  if (!vaults) {
    const err = 'Vault configurations are required';
    return queries.map(query => ({
      place: query.place,
      balance: undefined,
      error: err,
    }));
  }

  if (!evmCtx || !evmCtx.evmProviders) {
    const err =
      'EVM context with providers is required for Beefy vault queries';
    return queries.map(query => ({
      place: query.place,
      balance: undefined,
      error: err,
    }));
  }

  return Promise.all(
    queries.map(async (query): Promise<BeefyBalanceResult> => {
      await null;
      const { place, chainName, address } = query;
      try {
        const vaultAddress = getOwn(vaults, place);
        if (!vaultAddress) {
          const err = `No vault configuration for Beefy instrument: ${place}`;
          return { place, balance: undefined, error: err };
        }

        const balance = await getBeefyVaultBalance(
          vaultAddress,
          address,
          powers.chainNameToChainIdMap[chainName],
          evmCtx.evmProviders,
        );

        return { place, balance };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          place,
          balance: undefined,
          error: `Could not get Beefy balance: ${errorMsg}`,
        };
      }
    }),
  );
};
