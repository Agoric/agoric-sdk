import {
  PoolPlaces,
  type PoolKey,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import {
  makePortfolioQuery,
  planDepositTransfers,
  planTransfer,
} from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { X, q, assert } from '@endo/errors';
import type { CosmosRestClient } from './cosmos-rest-client.js';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';

// XXX add to PoolPlaces info?
const USDNconfig = {
  denom: 'usdn',
  chainName: 'noble',
};

const addressOfAccountId = (aid: `${string}:${string}:${string}`) =>
  aid.split(':', 3)[2];
const { make } = AmountMath;

export const getCurrentBalances = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  readPublished: VstorageKit['readPublished'],
  spectrum: SpectrumClient,
  cosmosRest: CosmosRestClient,
  brand: Brand<'nat'>,
) => {
  const pq = makePortfolioQuery(readPublished, portfolioKey);
  const status = await pq.getPortfolioStatus();
  const balances: Partial<Record<PoolKey, NatAmount>> = {};

  for (const posKey of status.positionKeys) {
    if (!(posKey in PoolPlaces)) continue; // XXX warn?
    const info = PoolPlaces[posKey as PoolKey];
    switch (info.protocol) {
      case 'USDN': {
        const { chainName, denom } = USDNconfig;
        const addr = addressOfAccountId(status.accountIdByChain[chainName]);
        const { amount } = await cosmosRest.getAccountBalance(
          USDNconfig.chainName,
          addr,
          denom,
        );
        balances[posKey] = make(brand, BigInt(amount));
        break;
      }
      case 'Aave':
      case 'Compound': {
        const { chainName } = info;
        const pool = info.protocol.toLocaleLowerCase() as Pool;
        const chain = chainName.toLocaleLowerCase() as Chain;
        const addr = addressOfAccountId(status.accountIdByChain[chainName]);
        const { balance } = await spectrum.getPoolBalance(chain, pool, addr);
        assert(Number.isSafeInteger(balance.supplyBalance));
        balances[posKey] = make(brand, BigInt(balance.supplyBalance));
        break;
      }
      default:
        // TODO: Beefy
        assert.fail(X`unknown protocol: ${q(posKey)}`);
    }
  }
  return harden(balances);
};

export const handleDeposit = async (
  amount: NatAmount,
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  readPublished: VstorageKit['readPublished'],
  spectrum: SpectrumClient,
  cosmosRest: CosmosRestClient,
) => {
  const currentBalances = await getCurrentBalances(
    portfolioKey,
    readPublished,
    spectrum,
    cosmosRest,
    amount.brand,
  );
  const pq = makePortfolioQuery(readPublished, portfolioKey);
  const { targetAllocation } = await pq.getPortfolioStatus();
  if (!targetAllocation) {
    // XXX warn?
    return;
  }
  const txfrs = planDepositTransfers(amount, currentBalances, targetAllocation);
  const steps = [
    { src: '+agoric', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    ...Object.entries(txfrs)
      // XXX Object.entries() type is goofy
      .map(([dest, amt]) => planTransfer(dest as PoolKey, amt))
      .flat(),
  ];
  console.log('TODO: submit steps', steps);
  throw Error('moar TODO');
};
