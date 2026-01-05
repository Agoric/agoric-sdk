import { assert, Fail, q, X } from '@endo/errors';

import { PoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import type {
  PoolKey,
  PoolPlaceInfo,
  StatusFor,
  TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import {
  fromTypedEntries,
  objectMap,
  objectMetaMap,
  typedEntries,
} from '@agoric/internal';
import type {
  AccountId,
  Caip10Record,
  CaipChainId,
} from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import {
  ACCOUNT_DUST_EPSILON,
  isInstrumentId,
  YieldProtocol,
} from '@agoric/portfolio-api';
import type { FundsFlowPlan, SupportedChain } from '@agoric/portfolio-api';

import { USDN, type CosmosRestClient } from './cosmos-rest-client.js';
import type { ChainAddressTokenBalance } from './graphql/api-spectrum-blockchain/__generated/graphql.ts';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { ProtocolPoolUserBalanceResult } from './graphql/api-spectrum-pools/__generated/graphql.ts';
import type { Sdk as SpectrumPoolsSdk } from './graphql/api-spectrum-pools/__generated/sdk.ts';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';
import { spectrumProtocols, UserInputError } from './support.ts';
import { getOwn, lookupValueForKey } from './utils.js';
import type { EvmChain, EvmContext } from './pending-tx-manager.ts';
import { getERC4626VaultsBalances } from './erc4626-utils.ts';

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

const rejectUserInput = (details: ReturnType<typeof X> | string): never =>
  assert.fail(details, ((...args) =>
    Reflect.construct(UserInputError, args)) as ErrorConstructor);

const isDust = (value: bigint): boolean =>
  -ACCOUNT_DUST_EPSILON < value && value < ACCOUNT_DUST_EPSILON;

const isNonemptyPositionEntry = (entry: [AssetPlaceRef, NatValue]): boolean => {
  const [place, value] = entry;
  return isInstrumentId(place) && value > 0n;
};

// Note the differences in the shape of field `balance` between the two Spectrum
// APIs (string vs. Record<'USDC' | 'USD' | string, number>).
type AccountBalance = ChainAddressTokenBalance['balance'];
const amountFromAccountBalance = (
  brand: Brand<'nat'>,
  balance: AccountBalance,
) =>
  balance === undefined
    ? undefined
    : AmountMath.make(brand, scale6(Number(balance)));
type PositionBalance = ProtocolPoolUserBalanceResult['balance'];
const amountFromPositionBalance = (
  brand: Brand<'nat'>,
  balanceRecord: PositionBalance,
) =>
  balanceRecord?.USDC === undefined
    ? undefined
    : AmountMath.make(brand, scale6(balanceRecord.USDC));

export type BalanceQueryPowers = {
  cosmosRest: CosmosRestClient;
  spectrum: SpectrumClient;
  spectrumBlockchain?: SpectrumBlockchainSdk;
  spectrumPools?: SpectrumPoolsSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  spectrumPoolIds: Partial<Record<PoolKey, string>>;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
  erc4626Vaults: Partial<Record<PoolKey, `0x${string}`>>;
  evmCtx: Omit<EvmContext, 'cosmosRest' | 'signingSmartWalletKit' | 'fetch'>;
  chainNameToChainIdMap: Record<EvmChain, CaipChainId>;
};

// UNTIL https://github.com/Agoric/agoric-sdk/issues/12186
// This should move into @agoric/orchestration/src/utils/address.js, which
// itself should be updated to conform with CAIP-10.
// cf. https://github.com/Agoric/agoric-sdk/pull/12185/commits/34667cf25cb11a90d348f72750af6e50d632a22d
const addressOfAccountId = (caip10AccountId: AccountId) =>
  parseAccountId(caip10AccountId).accountAddress;

export const getCurrentBalance = async (
  { protocol, chainName, ..._details }: PoolPlaceInfo,
  accountIdByChain: StatusFor['portfolio']['accountIdByChain'],
  { spectrum, cosmosRest }: BalanceQueryPowers,
): Promise<bigint> => {
  await null;
  switch (protocol) {
    case 'USDN': {
      const addr = addressOfAccountId(accountIdByChain[chainName] as any);
      // XXX add denom to PoolPlaceInfo?
      const resp = await cosmosRest.getAccountBalance(
        chainName,
        addr,
        USDN.base,
      );
      return BigInt(resp.amount);
    }
    case 'Aave':
    case 'Compound': {
      const pool = protocol.toLowerCase() as Pool;
      const chain = chainName.toLowerCase() as Chain;
      const addr = addressOfAccountId(accountIdByChain[chainName] as any);
      const resp = await spectrum.getPoolBalance(chain, pool, addr);
      const balance = resp.balance.supplyBalance;
      Number.isSafeInteger(balance) ||
        Fail`Invalid balance for chain ${q(chain)} pool ${q(pool)} address ${addr}: ${balance}`;
      return BigInt(balance);
    }
    default:
      // TODO: Beefy
      throw Fail`Unknown protocol: ${q(protocol)}`;
  }
};

type AccountQueryDescriptor = {
  place: AssetPlaceRef;
  chainName: SupportedChain;
  address: string;
  asset: string;
};

type PositionQueryDescriptor = {
  place: PoolKey;
  chainName: SupportedChain;
  protocol: PoolPlaceInfo['protocol'];
  address: string;
};

const makeSpectrumAccountQuery = (
  desc: AccountQueryDescriptor,
  powers: BalanceQueryPowers,
) => {
  const { chainName, address, asset } = desc;
  const chainId = lookupValueForKey(powers.spectrumChainIds, chainName);
  if (asset !== 'USDC') {
    // "USDN" -> "usdn"
    return { chain: chainId, address, token: asset.toLowerCase() };
  }
  const token = lookupValueForKey(powers.usdcTokensByChain, chainName);
  return { chain: chainId, address, token };
};

const makeSpectrumPoolQuery = (
  desc: PositionQueryDescriptor,
  powers: BalanceQueryPowers,
) => {
  const { place, chainName, protocol, address } = desc;
  return {
    chain: lookupValueForKey(powers.spectrumChainIds, chainName),
    protocol: lookupValueForKey(spectrumProtocols, protocol),
    pool: lookupValueForKey(powers.spectrumPoolIds, place),
    address,
  };
};

export type ERC4626VaultQuery = {
  place: PoolKey;
  chainName: SupportedChain;
  address: string;
};

export const getCurrentBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount | undefined>>> => {
  const { positionKeys, accountIdByChain } = status;
  const { spectrumBlockchain, spectrumPools } = powers;
  const addressInfo = new Map<SupportedChain, Caip10Record>();
  const accountQueries = [] as AccountQueryDescriptor[];
  const positionQueries = [] as PositionQueryDescriptor[];
  const erc4626Queries = [] as PositionQueryDescriptor[];
  const balances = new Map<AssetPlaceRef, NatAmount | undefined>();
  const errors = [] as Error[];
  for (const [chainName, accountId] of typedEntries(
    accountIdByChain as Required<typeof accountIdByChain>,
  )) {
    const place = `@${chainName}` as AssetPlaceRef;
    balances.set(place, undefined);
    try {
      const addressParts = parseAccountId(accountId);
      addressInfo.set(chainName, addressParts);
      const { accountAddress: address } = addressParts;
      accountQueries.push({ place, chainName, address, asset: 'USDC' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      errors.push(Error(`Invalid CAIP-10 address for chain: ${chainName}`));
    }
  }
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
      if (namespace !== 'eip155') {
        // USDN Vaults are not "pools" and specifically are not in the Spectrum
        // Pools API.
        accountQueries.push({ place, chainName, address, asset: protocol });
        continue;
      }

      if (protocol === YieldProtocol.ERC4626) {
        erc4626Queries.push({ place, chainName, protocol, address });
      } else {
        positionQueries.push({ place, chainName, protocol, address });
      }
    } catch (err) {
      errors.push(err);
    }
  }
  await null;

  // Process any ERC4626 vault queries first. These dont rely on Spectrum.
  if (erc4626Queries.length) {
    const erc4626QueryResults = await getERC4626VaultsBalances(
      erc4626Queries,
      powers,
    );
    for (let i = 0; i < erc4626QueryResults.length; i += 1) {
      const result = erc4626QueryResults[i];
      if (result.error) {
        errors.push(Error(result.error));
      }
      if (result.balance === undefined) {
        balances.set(result.place, undefined);
      } else {
        balances.set(result.place, AmountMath.make(brand, result.balance));
      }
    }
  }

  if (spectrumBlockchain && spectrumPools) {
    const spectrumAccountQueries = accountQueries.map(desc =>
      makeSpectrumAccountQuery(desc, powers),
    );
    const spectrumPoolQueries = positionQueries.map(desc =>
      makeSpectrumPoolQuery(desc, powers),
    );

    const [accountResult, positionResult] = await Promise.allSettled([
      spectrumAccountQueries.length
        ? spectrumBlockchain.getBalances({ accounts: spectrumAccountQueries })
        : { balances: [] },
      spectrumPoolQueries.length
        ? spectrumPools.getBalances({ positions: spectrumPoolQueries })
        : { balances: [] },
    ]);

    if (
      accountResult.status !== 'fulfilled' ||
      positionResult.status !== 'fulfilled'
    ) {
      const rejections = [accountResult, positionResult].flatMap(settlement =>
        settlement.status === 'fulfilled' ? [] : [settlement.reason],
      );
      errors.push(...rejections);
      throw AggregateError(errors, 'Could not get balances');
    }
    const accountBalances = accountResult.value.balances;
    const positionBalances = positionResult.value.balances;
    if (
      accountBalances.length !== accountQueries.length ||
      positionBalances.length !== positionQueries.length
    ) {
      const msg = `Bad balance query response(s), expected [${[accountBalances.length, positionBalances.length]}] results but got [${[accountQueries.length, positionQueries.length]}]`;
      throw AggregateError(errors, msg);
    }
    for (let i = 0; i < accountQueries.length; i += 1) {
      const { place, asset } = accountQueries[i];
      const result = accountBalances[i];
      if (result.error) errors.push(Error(result.error));
      const balanceAmount = amountFromAccountBalance(brand, result.balance);
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
    for (let i = 0; i < positionQueries.length; i += 1) {
      const { place } = positionQueries[i];
      const result = positionBalances[i];
      if (result.error) errors.push(Error(result.error));
      balances.set(place, amountFromPositionBalance(brand, result.balance));
    }
  }
  if (errors.length) {
    throw AggregateError(errors, 'Could not accept balances');
  }
  const balancesExist = Array.from(balances.values()).some(v => !!v);
  if (balancesExist) return Object.fromEntries(balances);

  // XXX Fallback during the transition to using only Spectrum GraphQL.
  const balanceEntries = await Promise.all(
    positionKeys.map(async (posKey: PoolKey): Promise<[PoolKey, NatAmount]> => {
      await null;
      try {
        const poolPlaceInfo =
          getOwn(PoolPlaces, posKey) || Fail`Unknown PoolPlace`;
        // TODO there should be a bulk query operation available now
        const amountValue = await getCurrentBalance(
          poolPlaceInfo,
          accountIdByChain,
          powers,
        );
        return [posKey, AmountMath.make(brand, amountValue)];
      } catch (cause) {
        errors.push(Error(`Could not get ${posKey} balance`, { cause }));
        // @ts-expect-error
        return [posKey, undefined];
      }
    }),
  );
  if (errors.length) {
    throw AggregateError(errors, 'Could not get balances');
  }
  const currentBalances = fromTypedEntries(balanceEntries);
  return currentBalances;
};

export const getNonDustBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount>>> => {
  const currentBalances = await getCurrentBalances(status, brand, powers);
  const nonDustBalances = objectMetaMap(currentBalances, desc =>
    desc.value && desc.value.value > ACCOUNT_DUST_EPSILON ? desc : undefined,
  );
  return nonDustBalances;
};

/**
 * Derive weighted targets for allocation keys. Additionally, always zero out hub balances
 * (chains; keys starting with '@') that have non-zero current amounts. Returns only entries
 * whose values change by at least ACCOUNT_DUST_EPSILON compared to current.
 */
const computeWeightedTargets = (
  brand: Brand<'nat'>,
  currentAmounts: Partial<Record<AssetPlaceRef, NatAmount>>,
  balanceDelta: bigint,
  allocation: TargetAllocation = {},
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const currentValues = objectMap(
    currentAmounts as Required<typeof currentAmounts>,
    amount => amount.value,
  );
  const currentTotal = Object.values(currentValues).reduce(
    (acc, value) => acc + value,
    0n,
  );
  const total = currentTotal + balanceDelta;
  total >= 0n || rejectUserInput('Insufficient funds for withdrawal.');

  const weights: [AssetPlaceRef, NatValue][] = Object.keys(allocation).length
    ? typedEntries({
        // Any current balance with no target has an effective weight of 0.
        ...objectMap(currentValues, () => 0n),
        ...(allocation as Required<typeof allocation>),
      })
    : // In the absence of target weights, maintain the relative status quo but
      // zero out hubs (chains) if there is anywhere else to deploy their funds.
      (valueEntries => {
        return valueEntries.some(isNonemptyPositionEntry)
          ? valueEntries.map(([p, v]) => [p, isInstrumentId(p) ? v : 0n])
          : valueEntries;
      })(typedEntries(currentValues));
  const sumW = weights.reduce<bigint>((acc, entry) => {
    const w = entry[1];
    (typeof w === 'bigint' && w >= 0n) ||
      rejectUserInput(
        X`Target allocation weight in ${entry} must be a natural number.`,
      );
    return acc + w;
  }, 0n);
  sumW > 0n ||
    rejectUserInput('Total target allocation weights must be positive.');

  // Try to satisfy the weights, leaving any amount otherwise subject to
  // rounding loss or representing a too-small delta at the highest-weight
  // place that can accept it.
  const draft: Partial<Record<AssetPlaceRef, NatValue>> = {};
  let remainder = total;
  for (const [key, w] of weights) {
    const a = currentValues[key] || 0n;
    const b = (total * w) / sumW;
    const v = isDust(b - a) ? a : b;
    draft[key] = v;
    remainder -= v;
  }
  if (remainder !== 0n) {
    // eslint-disable-next-line no-nested-ternary
    weights.sort(([_k1, a], [_k2, b]) => (a < b ? 1 : a > b ? -1 : 0));
    for (const [key, _w] of weights) {
      const a = currentValues[key] || 0n;
      const v = (draft[key] || 0n) + remainder;
      if (v === a || !isDust(v - a)) {
        draft[key] = v;
        remainder = 0n;
        break;
      }
    }
    remainder === 0n ||
      rejectUserInput(
        X`Nowhere to place ${remainder} in update of ${currentValues} to ${draft}`,
      );
  }

  // Delete entries reflecting no change.
  for (const [key, amount] of Object.entries(draft)) {
    if (amount === currentValues[key]) {
      delete draft[key];
    }
  }

  return {
    ...objectMap(draft, (value: NatValue) => AmountMath.make(brand, value)),
  };
};

export type PlannerContext = {
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>;
  targetAllocation?: TargetAllocation;
  network: NetworkSpec;
  brand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  gasEstimator: GasEstimator;
};

/**
 * Plan deposit driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planDepositToAllocations = async (
  details: PlannerContext & { amount: NatAmount; fromChain?: SupportedChain },
): Promise<FundsFlowPlan> => {
  const { amount, brand, currentBalances, targetAllocation } = details;
  const { fromChain = 'agoric' } = details;
  if (!targetAllocation) return { flow: [] };
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    amount.value,
    targetAllocation,
  );

  // The deposit should be distributed.
  const depositFrom =
    // TODO(#12309): Remove the `<Deposit>` special case in favor of `+agoric`.
    (fromChain === 'agoric' ? '<Deposit>' : `+${fromChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [depositFrom]: amount };
  const resolvedTarget = { ...target, [depositFrom]: zeroAmount };

  const { network, feeBrand, gasEstimator } = details;
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

/**
 * Plan rebalance driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planRebalanceToAllocations = async (
  details: PlannerContext,
): Promise<FundsFlowPlan> => {
  const { brand, currentBalances, targetAllocation } = details;
  if (!targetAllocation) return { flow: [] };
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    0n,
    targetAllocation,
  );

  const { network, feeBrand, gasEstimator } = details;
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

/**
 * Plan withdrawal driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planWithdrawFromAllocations = async (
  details: PlannerContext & { amount: NatAmount; toChain?: SupportedChain },
): Promise<FundsFlowPlan> => {
  const { amount, brand, currentBalances, targetAllocation } = details;
  const { toChain = 'agoric' } = details;
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    -amount.value,
    targetAllocation,
  );

  const withdrawTo =
    // TODO(#12309): Remove the `<Cash>` special case in favor of `-agoric`.
    (toChain === 'agoric' ? '<Cash>' : `-${toChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [withdrawTo]: zeroAmount };
  const resolvedTarget = { ...target, [withdrawTo]: amount };

  const { network, feeBrand, gasEstimator } = details;
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
