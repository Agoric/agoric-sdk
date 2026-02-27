import { Contract } from 'ethers';
import type { WebSocketProvider } from 'ethers';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { CaipChainId } from '@agoric/orchestration';
import type { SupportedChain } from '@agoric/portfolio-api';
import {
  isBeefyInstrumentId,
  isERC4626InstrumentId,
} from '@agoric/portfolio-api/src/type-guards.js';
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
  ...ERC20_BALANCE_ABI,
  {
    name: 'getPricePerFullShare',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// https://ethereum.org/developers/docs/standards/tokens/erc-4626#methods
const ERC4626_VAULT_ABI = [
  ...ERC20_BALANCE_ABI,
  {
    name: 'convertToAssets',
    type: 'function',
    inputs: [{ name: 'shares', type: 'uint256' }],
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
 * Fetch the underlying asset balance for a Beefy vault position.
 * Gets mooToken shares via `balanceOf`, then scales by
 * `getPricePerFullShare()` (1e18 precision) to get the underlying value.
 */
const getBeefyVaultBalance = async (
  vaultAddress: string,
  userAddress: string,
  provider: WebSocketProvider,
): Promise<bigint> => {
  const vault = new Contract(vaultAddress, BEEFY_VAULT_ABI, provider);
  await null;
  try {
    const shares: bigint = await vault.balanceOf(userAddress);
    if (shares === 0n) {
      return 0n;
    }
    const pricePerFullShare: bigint = await vault.getPricePerFullShare();
    return (shares * pricePerFullShare) / BEEFY_VAULT_DECIMALS;
  } catch (cause) {
    throw Error(`Failed to fetch Beefy vault balance`, { cause });
  }
};

/**
 * Fetch the underlying asset balance for an ERC-4626 vault position.
 * Gets vault shares via `balanceOf`, then converts to underlying assets
 * using the vault's `convertToAssets()` method.
 */
const getERC4626VaultBalance = async (
  vaultAddress: string,
  userAddress: string,
  provider: WebSocketProvider,
): Promise<bigint> => {
  const vault = new Contract(vaultAddress, ERC4626_VAULT_ABI, provider);
  await null;
  try {
    const shares: bigint = await vault.balanceOf(userAddress);
    if (shares === 0n) {
      return 0n;
    }
    const underlying: bigint = await vault.convertToAssets(shares);
    return underlying;
  } catch (cause) {
    throw Error(`Failed to fetch ERC-4626 vault balance`, { cause });
  }
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
 * Fetch EVM position balances by querying receipt token contracts directly.
 *
 * Dispatches to protocol-specific functions:
 * - Beefy: `balanceOf` + `getPricePerFullShare()` scaling
 * - ERC4626 (Morpho, etc.): `balanceOf` + `convertToAssets()`
 * - Default (Aave, Compound): simple `balanceOf` (already underlying)
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

        let balance: bigint;
        if (isBeefyInstrumentId(place)) {
          balance = await getBeefyVaultBalance(tokenAddress, address, provider);
        } else if (isERC4626InstrumentId(place)) {
          balance = await getERC4626VaultBalance(
            tokenAddress,
            address,
            provider,
          );
        } else {
          balance = await getEVMPositionBalance(
            tokenAddress,
            address,
            provider,
          );
        }

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
