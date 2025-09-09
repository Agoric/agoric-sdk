import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
  type StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { Fail, q } from '@endo/errors';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import {
  planDepositTransfers,
  planTransfer,
} from '@aglocal/portfolio-contract/src/plan-transfers.ts';
import type { CosmosRestClient } from './cosmos-rest-client.js';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';

const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  Object.hasOwn(obj, key) ? obj[key] : undefined;

const addressOfAccountId = (aid: `${string}:${string}:${string}`) =>
  aid.split(':', 3)[2];

export const getCurrentBalance = async (
  { protocol, chainName, ..._details }: PoolPlaceInfo,
  accountIdByChain: StatusFor['portfolio']['accountIdByChain'],
  {
    spectrum,
    cosmosRest,
  }: { spectrum: SpectrumClient; cosmosRest: CosmosRestClient },
): Promise<bigint> => {
  await null;
  switch (protocol) {
    case 'USDN': {
      const addr = addressOfAccountId(accountIdByChain[chainName]);
      // XXX add denom to PoolPlaceInfo?
      const resp = await cosmosRest.getAccountBalance(chainName, addr, 'usdn');
      return BigInt(resp.amount);
    }
    case 'Aave':
    case 'Compound': {
      const pool = protocol.toLowerCase() as Pool;
      const chain = chainName.toLowerCase() as Chain;
      const addr = addressOfAccountId(accountIdByChain[chainName]);
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

export const handleDeposit = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  powers: {
    readPublished: VstorageKit['readPublished'];
    spectrum: SpectrumClient;
    cosmosRest: CosmosRestClient;
  },
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { targetAllocation, positionKeys, accountIdByChain } = status;
  if (!targetAllocation) return;
  const errors = [] as Error[];
  const balanceEntries = await Promise.all(
    positionKeys.map(async (posKey: PoolKey): Promise<[PoolKey, NatAmount]> => {
      await null;
      try {
        const poolPlaceInfo =
          getOwn(PoolPlaces, posKey) || Fail`Unknown PoolPlace`;
        const amountValue = await getCurrentBalance(
          poolPlaceInfo,
          accountIdByChain,
          powers,
        );
        return [posKey, AmountMath.make(amount.brand, amountValue)];
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
  const balances = Object.fromEntries(balanceEntries);
  const transfers = planDepositTransfers(amount, balances, targetAllocation);
  const steps = [
    { src: '+agoric', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    ...Object.entries(transfers).flatMap(([dest, amt]) =>
      planTransfer(dest as PoolKey, amt, feeBrand),
    ),
  ];
  return steps;
};
