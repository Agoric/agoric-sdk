/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { E } from '@endo/far';
import type { OfferArgsFor, ProposalType } from '../src/type-guards.ts';
import {
  grokRebalanceScenarios,
  importCSV,
  withBrand,
} from '../tools/rebalance-grok.ts';
import { setupTrader, simulateUpcallFromAxelar } from './contract-setup.ts';
import { localAccount0, makeCCTPTraffic, makeUSDNIBCTraffic } from './mocks.ts';

// Again, use an EVM chain whose axelar ID differs from its chain name
const sourceChain = 'arbitrum';

const { values } = Object;

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const scenarios = await scenariosP;
    const scenario = scenarios[description];
    if (!scenario) return t.fail(`Scenario "${description}" not found`);
    t.log('start', description, 'with', myBalance);

    const { ibcBridge } = common.mocks;
    for (const money of [300, 500, 2_000, 3_000, 3_333.33, 5_000]) {
      for (const { msg, ack } of values({
        ...makeUSDNIBCTraffic(undefined, `${money * 1_000_000}`),
        ...makeUSDNIBCTraffic(undefined, `${money * 1_000_000}`, {
          denom: 'uusdn',
          denomTo: 'uusdc',
        }),
        ...makeCCTPTraffic(undefined, `${money * 1_000_000}`),
      })) {
        ibcBridge.addMockAck(msg, ack);
      }
    }

    const { usdc } = common.brands;
    const sceneB = withBrand(scenario, usdc.brand);
    const sceneBP = scenario.previous
      ? withBrand(scenarios[scenario.previous], usdc.brand)
      : undefined;

    if (description.includes('Recover')) {
      // simulate arrival of funds in the LCA via IBC from Noble
      const funds = await common.utils.pourPayment(usdc.units(500));
      const { bankManager } = common.bootstrap;
      const bank = E(bankManager).getBankForAddress(localAccount0);
      const purse = E(bank).getPurse(usdc.brand);
      await E(purse).deposit(funds);
    }

    const upcallDone = new Set();

    const ackSteps = async (offerArgs: OfferArgsFor['openPortfolio']) => {
      const { flow: moves } = { flow: [], ...offerArgs };
      const { transmitVTransferEvent } = common.utils;
      for (const { dest } of moves) {
        await eventLoopIteration();
        if (dest === '@Arbitrum') {
          if (!upcallDone.has(dest)) {
            upcallDone.add(dest);
            await simulateUpcallFromAxelar(
              common.mocks.transferBridge,
              sourceChain,
            );
            continue;
          }
        }
        try {
          await transmitVTransferEvent('acknowledgementPacket', -1);
        } catch (oops) {
          console.error('nothing to ack?', oops);
        }
      }
    };

    const openPortfolioAndAck = async (
      give: ProposalType['openPortfolio']['give'],
      offerArgs: OfferArgsFor['openPortfolio'] = {},
    ) => {
      const doneP = trader1.openPortfolio(t, give, offerArgs);
      await ackSteps(offerArgs);
      const { result, payouts } = await doneP;
      return { result, payouts };
    };

    const openOnly = Object.keys(sceneB.before).length === 0;
    const openResult = await (openOnly
      ? openPortfolioAndAck(sceneB.proposal.give, sceneB.offerArgs)
      : openPortfolioAndAck(sceneBP!.proposal.give, sceneBP!.offerArgs));

    const { result, payouts } = await (async () => {
      if (openOnly) return openResult;
      const x = trader1.rebalance(t, sceneB.proposal, sceneB.offerArgs);
      await ackSteps(sceneB.offerArgs);
      return x;
    })();

    const portfolioPath = trader1.getPortfolioPath();
    t.truthy(portfolioPath);

    // not interested in account addresses
    const { accountIdByChain: _1, ...portfolioStatus } =
      await trader1.getPortfolioStatus();

    t.log('after:', portfolioPath, portfolioStatus);

    const txfrs = await trader1.netTransfersByPosition();
    t.log('net transfers by position', txfrs);
    t.deepEqual(txfrs, sceneB.after, 'net transfers should match After row');

    t.log('payouts', payouts);
    const { Access: _, ...skipAssets } = payouts;
    t.deepEqual(skipAssets, sceneB.payouts, 'payouts');

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
