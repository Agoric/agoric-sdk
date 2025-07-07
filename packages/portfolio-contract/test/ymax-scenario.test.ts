/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { type NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { objectMap } from '@endo/patterns';
import type { YieldProtocol } from '../src/constants.js';
import {
  grokRebalanceScenarios,
  importCSV,
  numeral,
  type Dollars,
} from '../tools/rebalance-grok.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';

const obArgs = { destinationEVMChain: 'Ethereum' } as const; // TODO: should be optional

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const scenario = (await scenariosP)[description];
    if (!scenario) return t.fail(`Scenario "${description}" not found`);
    t.log('start', description, 'with', myBalance);

    const { usdc } = common.brands;
    const $ = (amt: Dollars) =>
      multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

    const openPortfolio = async (
      give: Partial<Record<YieldProtocol, NatAmount>>,
    ) => {
      const doneP = trader1.openPortfolio(t, give, obArgs);

      await eventLoopIteration();
      if (Object.keys(give).length > 0) {
        await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
      }
      if ('Aave' in give || 'Compound' in give) {
        await simulateUpcallFromAxelar(common.mocks.transferBridge).then(() =>
          simulateCCTPAck(common.utils).finally(() =>
            simulateAckTransferToAxelar(common.utils),
          ),
        );
      }
      const { result, payouts } = await doneP;
      return { result, payouts };
    };

    // Convert scenario amounts to ERTP amounts
    const give = objectMap(scenario.proposal.give, a => $(a!));
    const want = objectMap(scenario.proposal.want, a => $(a!));
    const before = objectMap(scenario.before, a => $(a!));
    const openOnly = Object.keys(before).length === 0;
    const openResult = await openPortfolio(openOnly ? give : before);

    const offerArgs =
      'Aave' in give || 'Compound' in give
        ? { destinationEVMChain: 'Base' as const }
        : {};

    const { result, payouts } = await (openOnly
      ? openResult
      : trader1.rebalance(t, { give, want }, offerArgs));

    const portfolioPath = trader1.getPortfolioPath();
    t.truthy(portfolioPath);

    // not interested in account addresses
    const { accountIdByChain: _1, ...portfolioStatus } =
      await trader1.getPortfolioStatus();

    t.log('after:', portfolioPath, portfolioStatus);

    const txfrs = await trader1.netTransfersByProtocol();
    t.log('net transfers by protocol', txfrs);
    t.deepEqual(
      txfrs,
      objectMap(scenario.after, $),
      'net transfers should match After row',
    );

    t.log('payouts', payouts);
    const { Access: _, ...skipAssets } = payouts;
    t.deepEqual(skipAssets, objectMap(scenario.payouts, $), 'payouts');

    // TODO: inspect bridge for correct flow to remote chains?
  },
  title(providedTitle = '', description: string) {
    return `${providedTitle} ${description}`.trim();
  },
});

test('scenario:', rebalanceScenarioMacro, 'Open empty portfolio');
test.skip('scenario:', rebalanceScenarioMacro, 'Aave -> USDN');

const scenariosP = importCSV('./rebalance-cases.csv', import.meta.url).then(
  data => grokRebalanceScenarios(data),
);
