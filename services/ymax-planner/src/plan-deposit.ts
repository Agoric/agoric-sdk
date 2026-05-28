import { assert, Fail } from '@endo/errors';

import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type {
  PoolKey,
  PoolPlaceInfo,
  StatusFor,
  TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { PoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import { computeTargetBalances } from '@agoric/portfolio-api/src/target-balances.js';
import type { ComputeTargetBalancesOptions } from '@agoric/portfolio-api/src/target-balances.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { objectMetaMap, typedEntries } from '@agoric/internal';
import type { Caip10Record, CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type {
  FundsFlowPlan,
  InterChainAccountRef,
  SupportedChain,
} from '@agoric/portfolio-api';
import { ACCOUNT_DUST_EPSILON } from '@agoric/portfolio-api';

import type { EvmAddress } from '@agoric/fast-usdc';
import type { WebSocketProvider } from 'ethers';
import { getErc20Balances } from './evm-utils.ts';
import type {
  ChainAddressTokenBalance as SpectrumGetAddressBalanceResult,
  ChainAddressTokenInput as SpectrumGetAddressBalanceInput,
} from './graphql/api-spectrum-blockchain/__generated/graphql.ts';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { EvmChain } from './pending-tx-manager.ts';
import { getOwn, lookupValueForKey } from './utils.js';

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

const amountFromSpectrumAccountBalance = (
  brand: Brand<'nat'>,
  balance: SpectrumGetAddressBalanceResult['balance'],
) =>
  balance === undefined
    ? undefined
    : AmountMath.make(brand, scale6(Number(balance)));

export type BalanceQueryPowers = {
  spectrumBlockchain: SpectrumBlockchainSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  evmTokenAddresses: Partial<
    Record<InterChainAccountRef | PoolKey, EvmAddress>
  >;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
  evmProviders: Record<CaipChainId, WebSocketProvider>;
  chainNameToChainIdMap: Partial<Record<EvmChain, CaipChainId>>;
};

type AlchemyBalanceQuery = {
  place: InterChainAccountRef | PoolKey;
  chainName: SupportedChain;
  address: string;
  token: PoolPlaceInfo['protocol'] | 'USDC';
};

type SpectrumBalanceQuery = {
  place: AssetPlaceRef;
  chainName: SupportedChain;
  address: string;
  asset: string;
};

const makeSpectrumGetAddressBalanceInput = (
  desc: Pick<SpectrumBalanceQuery, 'chainName' | 'address' | 'asset'>,
  powers: BalanceQueryPowers,
): SpectrumGetAddressBalanceInput => {
  const { chainName, address, asset } = desc;
  const chainId = lookupValueForKey(powers.spectrumChainIds, chainName);
  const token =
    asset === 'USDC'
      ? lookupValueForKey(powers.usdcTokensByChain, chainName)
      : // "USDN" -> "usdn"
        asset.toLowerCase();
  return { chain: chainId, address, token };
};

export const getCurrentBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount | undefined>>> => {
  const { positionKeys, accountIdByChain } = status;
  const { spectrumBlockchain } = powers;
  const addressInfo = new Map<SupportedChain, Caip10Record>();
  /** Queries for Alchemy (EVM account & position balances) */
  const alchemyQueries = [] as AlchemyBalanceQuery[];
  /** Queries for the Spectrum Blockchain API (non-EVM account balances) */
  const spectrumAccountQueries = [] as SpectrumBalanceQuery[];
  const balances = new Map<AssetPlaceRef, NatAmount | undefined>();
  const errors = [] as Error[];

  // Define account queries (EVM chains via Alchemy, others via Spectrum).
  for (const [chainName, accountId] of typedEntries(
    accountIdByChain as Required<typeof accountIdByChain>,
  )) {
    const place = `@${chainName}` as AssetPlaceRef;
    balances.set(place, undefined);
    try {
      const addressParts = parseAccountId(accountId);
      addressInfo.set(chainName, addressParts);
      const { namespace, accountAddress: address } = addressParts;
      if (namespace === 'eip155') {
        alchemyQueries.push({
          place: place as `@${EvmChain}`,
          chainName,
          address,
          token: 'USDC',
        });
      } else {
        spectrumAccountQueries.push({
          place,
          chainName,
          address,
          asset: 'USDC',
        });
      }
    } catch (cause) {
      const err = Error(
        `Cannot make query for ${chainName} address ${accountId}`,
        { cause },
      );
      errors.push(err);
    }
  }

  // Define position queries (EVM chains via Alchemy, others via Spectrum).
  for (const instrument of positionKeys) {
    const place = instrument;
    balances.set(place, undefined);
    try {
      const poolPlaceInfo =
        getOwn(PoolPlaces, instrument) ||
        Fail`Unknown instrument: ${instrument}`;
      const { chainName, protocol } = poolPlaceInfo;
      const { namespace, accountAddress: address } =
        addressInfo.get(chainName) ||
        Fail`No ${chainName} address for instrument ${instrument}`;
      if (namespace === 'eip155') {
        alchemyQueries.push({ place, chainName, address, token: protocol });
      } else {
        spectrumAccountQueries.push({
          place,
          chainName,
          address,
          asset: protocol,
        });
      }
    } catch (err) {
      errors.push(err);
    }
  }

  const [alchemyResult, spectrumAccountResult] = await Promise.allSettled([
    alchemyQueries.length
      ? getErc20Balances(alchemyQueries, powers)
      : { balances: [] },
    spectrumAccountQueries.length
      ? spectrumBlockchain.getBalances({
          accounts: spectrumAccountQueries.map(queryDesc =>
            makeSpectrumGetAddressBalanceInput(queryDesc, powers),
          ),
        })
      : { balances: [] },
  ]);

  if (
    alchemyResult.status !== 'fulfilled' ||
    spectrumAccountResult.status !== 'fulfilled'
  ) {
    const rejections = [alchemyResult, spectrumAccountResult].flatMap(
      settlement =>
        settlement.status === 'fulfilled' ? [] : [settlement.reason],
    );
    errors.push(...rejections);
    throw AggregateError(errors, 'Could not get balances');
  }
  const alchemyBalances = alchemyResult.value.balances;
  const spectrumAccountBalances = spectrumAccountResult.value.balances;
  if (
    alchemyBalances.length !== alchemyQueries.length ||
    spectrumAccountBalances.length !== spectrumAccountQueries.length
  ) {
    const msg = `Bad balance query response(s), expected [${[alchemyBalances.length, spectrumAccountBalances.length]}] results but got [${[alchemyQueries.length, spectrumAccountQueries.length]}]`;
    throw AggregateError(errors, msg);
  }

  for (let i = 0; i < alchemyBalances.length; i += 1) {
    const { place, balance, error } = alchemyBalances[i];
    if (error) {
      errors.push(Error(error));
    }
    balances.set(
      place as AssetPlaceRef,
      balance === undefined ? undefined : AmountMath.make(brand, balance),
    );
  }

  for (let i = 0; i < spectrumAccountQueries.length; i += 1) {
    const { place, asset } = spectrumAccountQueries[i];
    const result = spectrumAccountBalances[i];
    if (result.error) errors.push(Error(result.error));
    const balanceAmount = amountFromSpectrumAccountBalance(
      brand,
      result.balance,
    );
    balances.set(place, balanceAmount);
    // XXX as of 2025-11-19, spectrumBlockchain.getBalances returns @agoric
    // IBC USDC balances in micro-USDC (uusdc) rather than USDC like the rest.
    if (place === '@agoric' && asset === 'USDC' && result.balance) {
      if (!result.balance.match(/^[0-9]+$/)) {
        const msg = `⚠️ Got a non-integer balance ${result.balance} for @agoric USDC; verify scaling with Spectrum`;
        errors.push(Error(msg));
      }
      balances.set(place, AmountMath.make(brand, BigInt(result.balance)));
    }
  }

  if (errors.length) {
    throw AggregateError(errors, 'Could not accept balances');
  }
  return Object.fromEntries(balances);
};

export const getNonDustBalances = async <C extends AssetPlaceRef>(
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Record<C, NatAmount>> => {
  const currentBalances = await getCurrentBalances(status, brand, powers);
  const nonDustBalances = objectMetaMap(currentBalances, desc =>
    desc.value && desc.value.value > ACCOUNT_DUST_EPSILON ? desc : undefined,
  );
  return nonDustBalances;
};

export type PlannerContext<
  C extends AssetPlaceRef,
  T extends string & keyof TargetAllocation,
> = Pick<
  ComputeTargetBalancesOptions<C, T>,
  | 'brand'
  | 'currentBalances'
  | 'targetAllocation'
  | 'network'
> & {
  feeBrand: Brand<'nat'>;
  gasEstimator: GasEstimator;
};

type PlanMaker<D = unknown> = <
  C extends AssetPlaceRef,
  T extends keyof TargetAllocation,
>(
  details: PlannerContext<C, T> & D,
) => Promise<FundsFlowPlan>;

/** Plan absorption of a deposit into current balances and target weights. */
export const planDepositToAllocations: PlanMaker<{
  amount: NatAmount;
  fromChain?: SupportedChain;
}> = async details => {
  const {
    amount,
    brand,
    currentBalances,
    network,
    targetAllocation,
    fromChain = 'agoric',
  } = details;
  if (!targetAllocation) return { flow: [], order: undefined };
  const target = computeTargetBalances({
    brand,
    currentBalances,
    balanceDelta: amount.value,
    network,
    targetAllocation,
    depositFromChain: fromChain,
  });
  if (Object.keys(target).length === 0) return { flow: [], order: undefined };

  const { feeBrand, gasEstimator } = details;
  const depositFrom =
    // TODO(#12309): Remove the `<Deposit>` special case in favor of `+agoric`.
    (fromChain === 'agoric' ? '<Deposit>' : `+${fromChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [depositFrom]: amount };
  const resolvedTarget = { ...target, [depositFrom]: zeroAmount };
  const flowDetail = await planRebalanceFlow({
    network,
    current: resolvedCurrent,
    target: resolvedTarget,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};

/** Plan rebalancing of current balances against target weights. */
export const planRebalanceToAllocations: PlanMaker = async details => {
  const { brand, currentBalances, network, targetAllocation } = details;
  if (!targetAllocation) return { flow: [], order: undefined };
  const target = computeTargetBalances({
    brand,
    currentBalances,
    network,
    targetAllocation,
  });
  if (Object.keys(target).length === 0) return { flow: [], order: undefined };

  const { feeBrand, gasEstimator } = details;
  const flowDetail = await planRebalanceFlow({
    network,
    current: currentBalances,
    target,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};

/** Plan a rebalancing withdrawal from current balances and target weights. */
export const planWithdrawFromAllocations: PlanMaker<{
  amount: NatAmount;
  toChain?: SupportedChain;
}> = async details => {
  const { amount, brand, currentBalances, network, targetAllocation } = details;
  const target = computeTargetBalances({
    brand,
    currentBalances,
    network,
    balanceDelta: -amount.value,
    targetAllocation,
  });

  const { feeBrand, gasEstimator, toChain = 'agoric' } = details;
  const withdrawTo =
    // TODO(#12309): Remove the `<Cash>` special case in favor of `-agoric`.
    (toChain === 'agoric' ? '<Cash>' : `-${toChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [withdrawTo]: zeroAmount };
  const resolvedTarget = { ...target, [withdrawTo]: amount };
  const flowDetail = await planRebalanceFlow({
    network,
    current: resolvedCurrent,
    target: resolvedTarget,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};
