import { parseArgs } from 'node:util';
/** @file submit an empty rebalance plan for a portfolio */
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { RunTools } from './wallet-admin-types.ts';

const options = {
  'portfolio-id': { type: 'string' },
} as const;

const submitPlan = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { 'portfolio-id': rawPortfolioId } = values;
  if (!rawPortfolioId) throw Error('--portfolio-id missing');
  const portfolioId = Number(rawPortfolioId);
  if (!Number.isInteger(portfolioId))
    throw Error(`portfolio-id? ${rawPortfolioId}`);

  const account = await makeAccount('MNEMONIC');
  const planner = account.store.get<PortfolioPlanner>('planner');
  const policyVersion = 0; // XXX should get from vstorage
  const rebalanceCount = 0;
  await planner.submit(portfolioId, [], policyVersion, rebalanceCount);
};

export default submitPlan;
