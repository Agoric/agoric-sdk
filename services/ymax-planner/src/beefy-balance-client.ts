/* eslint-disable max-classes-per-file */
import { Contract, type WebSocketProvider } from 'ethers';
import { BeefyPoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import {
  axelarConfig,
  axelarConfigTestnet,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { Fail, q } from '@endo/errors';
import type { EvmProviders } from './support.js';
import type { ClusterName } from './config.js';

type CaipChainId = `eip155:${number}`;
type HexAddress = `0x${string}`;
type PoolKey = keyof typeof BeefyPoolPlaces;
type AccountId = `${string}:${string}:${string}`;

/**
 * Minimal ABI for BeefyVaultV7 contract
 * @see https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol
 */
const BEEFY_VAULT_ABI = [
  // Get user's vault share balance (mooToken balance)
  'function balanceOf(address account) external view returns (uint256)',
  // Get the current price per full share (18 decimals)
  'function getPricePerFullShare() external view returns (uint256)',
  // Alternative: some vaults use balance() for total underlying
  'function balance() external view returns (uint256)',
  // Total supply of vault shares
  'function totalSupply() external view returns (uint256)',
];

interface BeefyBalanceClientPowers {
  evmProviders: EvmProviders;
  clusterName: ClusterName;
  log?: (...args: unknown[]) => void;
}

export class BeefyBalanceClient {
  private readonly evmProviders: EvmProviders;

  private readonly clusterName: ClusterName;

  private readonly log: (...args: unknown[]) => void;

  constructor(powers: BeefyBalanceClientPowers) {
    this.evmProviders = powers.evmProviders;
    this.clusterName = powers.clusterName;
    this.log = powers.log ?? (() => {});
  }

  /**
   * Parse account ID to extract CAIP chain ID and address
   * AccountId format: namespace:reference:address (e.g., "eip155:1:0xabc...")
   */
  private static parseAccountId(accountId: AccountId): {
    caipChainId: CaipChainId;
    address: HexAddress;
  } {
    const parts = accountId.split(':');
    if (parts.length !== 3) {
      throw Fail`Invalid account ID format: ${q(accountId)}`;
    }
    const [namespace, reference, address] = parts;
    if (namespace !== 'eip155') {
      throw Fail`Expected eip155 namespace, got ${q(namespace)}`;
    }
    return {
      caipChainId: `${namespace}:${reference}` as CaipChainId,
      address: address as HexAddress,
    };
  }

  /**
   * Get the WebSocket provider for a given CAIP chain ID
   */
  private getProvider(caipChainId: CaipChainId): WebSocketProvider {
    const provider = this.evmProviders[caipChainId];
    provider || Fail`No provider available for chain ${q(caipChainId)}`;
    return provider;
  }

  /**
   * Get vault address for a given chain and pool key
   */
  private getVaultAddress(chainName: string): HexAddress {
    const poolKey = Object.keys(BeefyPoolPlaces).find(key => {
      const place = BeefyPoolPlaces[key as PoolKey];
      return place.chainName === chainName;
    }) as PoolKey | undefined;

    if (!poolKey) {
      throw Fail`No Beefy pool found for chain ${q(chainName)}`;
    }

    const config =
      this.clusterName === 'mainnet' ? axelarConfig : axelarConfigTestnet;

    const chainContracts = config[chainName];
    if (!chainContracts) {
      throw Fail`No contracts configured for chain ${q(chainName)}`;
    }

    const vaultAddress = chainContracts.contracts[poolKey];
    if (!vaultAddress) {
      throw Fail`No vault address configured for pool ${q(poolKey)} on chain ${q(chainName)}`;
    }

    return vaultAddress as HexAddress;
  }

  /**
   * Get the underlying USDC balance for a user in a Beefy vault
   *
   * @param chainName - The chain name (e.g., 'Ethereum', 'Avalanche')
   * @param accountId - The user's account ID in CAIP format (e.g., 'eip155:1:0xabc...')
   * @returns The underlying USDC balance in the smallest unit (e.g., USDC has 6 decimals)
   */
  async getVaultBalance(
    chainName: string,
    accountId: AccountId,
  ): Promise<bigint> {
    await null;
    try {
      const { caipChainId, address } = BeefyBalanceClient.parseAccountId(accountId);

      const provider = this.getProvider(caipChainId);
      const vaultAddress = this.getVaultAddress(chainName);

      const vault = new Contract(vaultAddress, BEEFY_VAULT_ABI, provider);

      const shareBalanceRaw = await vault.balanceOf(address);
      const shareBalance = BigInt(shareBalanceRaw.toString());

      // If user has no shares, return 0
      if (shareBalance === 0n) {
        return 0n;
      }

      // Get price per full share to convert shares to underlying USDC
      const pricePerShareRaw = await vault.getPricePerFullShare();
      const pricePerShare = BigInt(pricePerShareRaw.toString());

      // Calculate underlying balance
      // pricePerShare has 18 decimals, so we need to divide by 1e18
      const underlyingBalance = (shareBalance * pricePerShare) / 10n**18n;

      // Validate the result is a safe integer
      Number.isSafeInteger(Number(underlyingBalance)) ||
        Fail`Invalid balance for chain ${q(chainName)} vault ${vaultAddress} address ${address}: ${underlyingBalance}`;

      return underlyingBalance;
    } catch (err) {
      const error = err as Error;
      throw new BeefyBalanceError(
        `Failed to fetch Beefy vault balance for ${accountId} on ${chainName}: ${error.message}`,
        {
          chainName,
          accountId,
          cause: error,
        },
      );
    }
  }

}

class BeefyBalanceError extends Error {
  public readonly chainName: string;

  public readonly accountId: AccountId;

  public readonly cause?: Error;

  constructor(
    message: string,
    details: {
      chainName: string;
      accountId: AccountId;
      cause?: Error;
    },
  ) {
    const { chainName, accountId, cause } = details;
    super(message, { cause });
    this.name = 'BeefyBalanceError';
    this.chainName = chainName;
    this.accountId = accountId;
  }
}

harden(BeefyBalanceClient);
