/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { type NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { objectMap } from '@endo/patterns';
import {
  AxelarChain,
  type SupportedChain,
  type YieldProtocol,
} from '../src/constants.js';
import {
  grokRebalanceScenarios,
  importCSV,
  numeral,
  withBrand,
  type Dollars,
} from '../tools/rebalance-grok.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import { E } from '@endo/far';
import { localAccount0 } from './mocks.ts';
import { getChainNameOfPlaceRef } from '../src/type-guards-steps.ts';

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const scenario = (await scenariosP)[description];
    if (!scenario) return t.fail(`Scenario "${description}" not found`);
    t.log('start', description, 'with', myBalance);

    const { usdc } = common.brands;
    const s2 = withBrand(scenario, usdc.brand);

    if (description.includes('Recover')) {
      // simulate arrival of funds in the LCA via IBC from Noble
      const funds = await common.utils.pourPayment(usdc.units(500));
      const { bankManager } = common.bootstrap;
      const bank = E(bankManager).getBankForAddress(localAccount0);
      const purse = E(bank).getPurse(usdc.brand);
      await E(purse).deposit(funds);
    }

    const openPortfolio = async (
      give: Partial<Record<YieldProtocol, NatAmount>>,
      offerArgs = {},
    ) => {
      const doneP = trader1.openPortfolio(t, give, offerArgs);

      const { flow: moves = [] } = offerArgs;
      console.log('@@@openPortfolio moves', moves);

      for (const { dest } of moves) {
        await eventLoopIteration();
        if (dest === '@Ethereum') {
          await simulateUpcallFromAxelar(common.mocks.transferBridge);
        }
        common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
        // await simulateCCTPAck(common.utils).finally(() =>
        //   simulateAckTransferToAxelar(common.utils),
        // );
      }
      const { result, payouts } = await doneP;
      return { result, payouts };
    };

    // Convert scenario amounts to ERTP amounts
    const openOnly = Object.keys(s2.before).length === 0;
    const openResult = await openPortfolio(
      openOnly ? s2.proposal.give : s2.before,
      openOnly ? s2.offerArgs : {},
    );

    const { result, payouts } = await (openOnly
      ? openResult
      : trader1.rebalance(t, s2.proposal, s2.offerArgs));

    const portfolioPath = trader1.getPortfolioPath();
    t.truthy(portfolioPath);

    // not interested in account addresses
    const { accountIdByChain: _1, ...portfolioStatus } =
      await trader1.getPortfolioStatus();

    t.log('after:', portfolioPath, portfolioStatus);

    const txfrs = await trader1.netTransfersByPosition();
    t.log('net transfers by position', txfrs);
    t.deepEqual(txfrs, s2.after, 'net transfers should match After row');

    t.log('payouts', payouts);
    const { Access: _, ...skipAssets } = payouts;
    t.deepEqual(skipAssets, s2.payouts, 'payouts');

    // XXX: inspect bridge for netTransfersByPosition chains?
  },
  title(providedTitle = '', description: string) {
    return `${providedTitle} ${description}`.trim();
  },
});

test('scenario:', rebalanceScenarioMacro, 'Open empty portfolio');
test('scenario:', rebalanceScenarioMacro, 'Open portfolio with USDN position');
test('scenario:', rebalanceScenarioMacro, 'Recover funds from Noble ICA');
test('scenario:', rebalanceScenarioMacro, 'Open with 3 positions');

test.skip('scenario:', rebalanceScenarioMacro, 'Aave -> USDN');

const scenariosP = importCSV('./move-cases.csv', import.meta.url).then(data =>
  grokRebalanceScenarios(data),
);

test('list scenarios', async t => {
  const tested = [
    'Open empty portfolio',
    'Open portfolio with USDN position',
    'Recover funds from Noble ICA',
    'Open with 3 positions',
  ];
  const scenarios = await scenariosP;
  const names = Object.keys(scenarios);
  const todo = names.filter(n => !tested.includes(n));
  t.log('tested:', tested.length, 'todo:', todo.length, todo);
  t.true(names.length >= 3);
});
