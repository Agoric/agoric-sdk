import { Contract } from 'ethers';
import type { WebSocketProvider } from 'ethers';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { CaipChainId } from '@agoric/orchestration';
import type { SupportedChain } from '@agoric/portfolio-api';
import { isBeefyInstrumentId } from '@agoric/portfolio-api/src/type-guards.js';
import { Fail, q } from '@endo/errors';
import type { EvmChain } from './pending-tx-manager.ts';
import type { EvmProviders } from './support.ts';

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol
const BEEFY_VAULT_ABI = [
  {
    name: 'getPricePerFullShare',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const BEEFY_VAULT_DECIMALS = 10n ** 18n;

/**
 * Fetch the ERC-20 token balance for an address using an ethers WebSocketProvider.
 */
export const getEVMPositionBalance = async (
  tokenAddress: string,
  userAddress: string,
  provider: WebSocketProvider,
): Promise<bigint> => {
  const token = new Contract(tokenAddress, ERC20_BALANCE_ABI, provider);
  await null;
  try {
    const balance: bigint = await token.balanceOf(userAddress);
    return balance;
  } catch (cause) {
    throw Error(`Failed to fetch EVM position balance`, { cause });
  }
};

/**
 * Fetch the price per share for a Beefy vault (scaled by 1e18).
 */
const getBeefyPricePerShare = async (
  vaultAddress: string,
  provider: WebSocketProvider,
): Promise<bigint> => {
  const vault = new Contract(vaultAddress, BEEFY_VAULT_ABI, provider);
  await null;
  try {
    const pricePerFullShare: bigint = await vault.getPricePerFullShare();
    return pricePerFullShare;
  } catch (cause) {
    throw Error(`Failed to fetch Beefy price per share`, { cause });
  }
};

/**
 * Get the price-per-share scaling factor for a position.
 * Beefy vaults return mooToken shares, so we fetch `getPricePerFullShare()`
 * and divide by 1e18. For other protocols (Aave, Compound), `balanceOf`
 * already represents the underlying asset balance, so price per share is 1.
 */
const getPricePerShare = async (
  place: PoolKey,
  tokenAddress: string,
  provider: WebSocketProvider,
): Promise<{ numerator: bigint; denominator: bigint }> => {
  await null;
  if (isBeefyInstrumentId(place)) {
    const pricePerFullShare = await getBeefyPricePerShare(
      tokenAddress,
      provider,
    );
    return { numerator: pricePerFullShare, denominator: BEEFY_VAULT_DECIMALS };
  }
  return { numerator: 1n, denominator: 1n };
};

type PositionBalanceResult = {
  place: PoolKey;
  balance: bigint | undefined;
  error?: string;
};

export type EVMPositionQuery = {
  place: PoolKey;
  chainName: SupportedChain;
  address: string;
};

export type EVMPositionBalancePowers = {
  /** Map from instrument ID (e.g. 'Aave_Ethereum') to its receipt token address */
  positionTokenAddresses: Partial<Record<PoolKey, string>>;
  chainNameToChainIdMap: Partial<Record<EvmChain, CaipChainId>>;
  evmProviders: EvmProviders;
};

/**
 * Fetch EVM position balances by querying receipt token contracts directly,
 * as a replacement for spectrumPools.getBalances.
 *
 * Gets the raw token balance via `balanceOf`, then scales by the position's
 * price per share (Beefy uses `getPricePerFullShare()`; others default to 1).
 */
export const getEVMPositionBalances = async (
  queries: EVMPositionQuery[],
  powers: EVMPositionBalancePowers,
): Promise<{ balances: PositionBalanceResult[] }> => {
  const { positionTokenAddresses, chainNameToChainIdMap, evmProviders } =
    powers;

  const balances = await Promise.all(
    queries.map(async ({ place, chainName, address }) => {
      await null;
      try {
        const tokenAddress =
          positionTokenAddresses[place] ||
          Fail`No token address configured for instrument ${q(place)}`;

        const chainId: CaipChainId = chainNameToChainIdMap[chainName];
        const provider = evmProviders[chainId];
        if (!provider) {
          throw Error(`No provider found for chain: ${chainId}`);
        }

        const shares = await getEVMPositionBalance(
          tokenAddress,
          address,
          provider,
        );
        const { numerator, denominator } = await getPricePerShare(
          place,
          tokenAddress,
          provider,
        );
        const balance = (shares * numerator) / denominator;

        return { place, balance } as PositionBalanceResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          place,
          balance: undefined,
          error: `Could not get EVM position balance: ${message}`,
        } as PositionBalanceResult;
      }
    }),
  );

  return { balances };
};
