import { Contract } from 'ethers';
import type { WebSocketProvider } from 'ethers';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { CaipChainId } from '@agoric/orchestration';
import type {
  InterChainAccountRef,
  SupportedChain,
} from '@agoric/portfolio-api';
import {
  isBeefyInstrumentId,
  isERC4626InstrumentId,
} from '@agoric/portfolio-api/src/type-guards.js';
import { Fail, q } from '@endo/errors';
import type { EvmAddress } from '@agoric/fast-usdc';
import { fromUniqueEntries, partialMap, typedEntries } from '@agoric/internal';
import type { axelarConfig } from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { EVMContractAddresses } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { EvmChain } from './pending-tx-manager.ts';

/**
 * Build a unified map of pool/instrument IDs to their on-chain token contract
 * addresses from the axelar chain config. Extracts addresses for:
 * - ERC-4626 vaults
 * - Beefy vaults
 * - Aave pools
 * - Compound pools
 * - USDC tokens (for USDC-based positions without a receipt token)
 *
 * These addresses are used by {@link getErc20Balances} to query on-chain
 * balances via Alchemy
 */
export const getPoolTokenAddresses = (
  axelarCfg: typeof axelarConfig,
): Partial<Record<InterChainAccountRef | PoolKey, EvmAddress>> => {
  /**
   * Select contracts from `axelarCfg` using a function that ensures uniqueness
   * of the corresponding name (e.g., by embedding the chain name).
   * XXX This should take `axelarCfg` as an argument and be promoted up out of
   * getPoolTokenAddresses.
   */
  const pickContracts = <K extends InterChainAccountRef | PoolKey>(
    keyFromContractLabel: (
      name: keyof EVMContractAddresses,
      chainName: EvmChain,
    ) => K | boolean | undefined,
  ): Partial<Record<K, EvmAddress>> => {
    const selectedEntries = typedEntries(axelarCfg).flatMap(
      ([chainName, chainConfig]) =>
        partialMap(typedEntries(chainConfig.contracts), ([label, addr]) => {
          const key = keyFromContractLabel(label, chainName);
          return key && ([key === true ? label : key, addr] as [K, EvmAddress]);
        }),
    );
    return fromUniqueEntries(selectedEntries) as Partial<Record<K, EvmAddress>>;
  };
  const erc4626VaultAddresses = pickContracts(isERC4626InstrumentId);
  const beefyVaultAddresses = pickContracts(isBeefyInstrumentId);
  const aavePoolAddresses = pickContracts(
    (label, chainName) =>
      label === 'aaveUSDC' && (`Aave_${chainName}` as PoolKey),
  );
  const compoundPoolAddresses = pickContracts(
    (label, chainName) =>
      label === 'compound' && (`Compound_${chainName}` as PoolKey),
  );
  const usdcAddresses = pickContracts(
    (label, chainName) =>
      label === 'usdc' && (`@${chainName}` as `@${EvmChain}`),
  );

  const evmTokenAddresses = {
    ...erc4626VaultAddresses,
    ...beefyVaultAddresses,
    ...aavePoolAddresses,
    ...compoundPoolAddresses,
    ...usdcAddresses,
  } as Partial<Record<PoolKey, EvmAddress>>;

  return evmTokenAddresses;
};

/**
 * Minimal ERC-20 ABI for reading token balances via `balanceOf(address)`.
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-20#balanceof}
 */
export const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Minimal ABI for reading Beefy balances.
 * @see {@link https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol}
 */
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

/**
 * Minimal ABI for reading ERC-4626 balances.
 * @see {@link https://ethereum.org/developers/docs/standards/tokens/erc-4626#methods}
 */
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
export const getErc20Balance = async (
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
    throw Error(`Failed to fetch EVM balance`, { cause });
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

type EvmBalanceResult = {
  place: InterChainAccountRef | PoolKey;
  balance: bigint | undefined;
  error?: string;
};

export type EvmBalanceQuery = {
  place: InterChainAccountRef | PoolKey;
  chainName: SupportedChain;
  address: string;
};

export type EvmBalancePowers = {
  /** Map from place (e.g. 'Aave_Ethereum', '@Ethereum') to its token address */
  evmTokenAddresses: Partial<
    Record<InterChainAccountRef | PoolKey, EvmAddress>
  >;
  chainNameToChainIdMap: Partial<Record<EvmChain, CaipChainId>>;
  evmProviders: Record<CaipChainId, WebSocketProvider>;
};

/**
 * Fetch EVM balances by querying receipt token contracts directly.
 *
 * Dispatches to protocol-specific functions:
 * - Beefy: `balanceOf` + `getPricePerFullShare()` scaling
 * - ERC4626 (Morpho, etc.): `balanceOf` + `convertToAssets()`
 * - Default (Aave, Compound, EVM accounts): simple `balanceOf` (already underlying)
 */
export const getErc20Balances = async (
  queries: EvmBalanceQuery[],
  powers: EvmBalancePowers,
): Promise<{ balances: EvmBalanceResult[] }> => {
  const { evmTokenAddresses, chainNameToChainIdMap, evmProviders } = powers;

  const balances = await Promise.all(
    queries.map(async ({ place, chainName, address }) => {
      await null;
      try {
        const tokenAddress =
          evmTokenAddresses[place] ||
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
          balance = await getErc20Balance(tokenAddress, address, provider);
        }

        return { place, balance } as EvmBalanceResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          place,
          balance: undefined,
          error: `Could not get EVM balance: ${message}`,
        } as EvmBalanceResult;
      }
    }),
  );

  return { balances };
};
