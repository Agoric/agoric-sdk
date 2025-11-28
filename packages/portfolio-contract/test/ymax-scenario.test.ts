/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { TxType, type PublishedTx } from '@agoric/portfolio-api';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { inspect } from 'node:util';
import type { OfferArgsFor, ProposalType } from '../src/type-guards.ts';
import {
  grokRebalanceScenarios,
  importCSV,
  withBrand,
} from '../tools/rebalance-grok.ts';
import { setupTrader } from './contract-setup.ts';
import {
  makeCCTPTraffic,
  makeUSDNIBCTraffic,
  portfolio0lcaOrch,
} from './mocks.ts';
import { getResolverMakers, settleTransaction } from './resolver-helpers.ts';
import { makeStorageTools } from './supports.ts';

const { values } = Object;

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, common, started, zoe } = await setupTrader(t);
    const scenarios = await scenariosP;
    const rawScenario = scenarios[description];
    if (!rawScenario) return t.fail(`Scenario "${description}" not found`);
    t.log('start', description, inspect(rawScenario, { depth: 5 }));

    const { ibcBridge } = common.mocks;
    for (const money of [
      300, 500, 1_500, 2_000, 3_000, 3_333.33, 5_000, 6_666.67, 10_000,
    ]) {
      for (const { msg, ack } of values({
        ...makeUSDNIBCTraffic(undefined, `${money * 1_000_000}`),
        ...makeCCTPTraffic(undefined, `${money * 1_000_000}`),
      })) {
        ibcBridge.addMockAck(msg, ack);
      }
    }

    const { storage } = common.bootstrap;
    const { readPublished } = makeStorageTools(storage);

    const { usdc } = common.brands;
    const scenario = withBrand(rawScenario, usdc.brand);
    const previous = scenario.previous
      ? withBrand(scenarios[scenario.previous], usdc.brand)
      : undefined;

    const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);

    if (description.includes('Recover')) {
      // simulate arrival of funds in the LCA via IBC from Noble
      const funds = await common.utils.pourPayment(usdc.units(500));
      const { bankManager } = common.bootstrap;
      const bank = E(bankManager).getBankForAddress(portfolio0lcaOrch);
      const purse = E(bank).getPurse(usdc.brand);
      await E(purse).deposit(funds);
    }

    let index = 0;

    const ackSteps = async (offerArgs: OfferArgsFor['openPortfolio']) => {
      const { flow: moves } = { flow: [], ...offerArgs };
      const { transmitVTransferEvent } = common.utils;

      await transmitVTransferEvent('acknowledgementPacket', -1); // NFA

      const evmInvloved = moves.some(
        move => move.src === '@Arbitrum' || move.dest === '@Arbitrum',
      );
      // Settle make account only if we know an EVM account is going to be made
      if (evmInvloved) {
        await transmitVTransferEvent('acknowledgementPacket', -2); // NFA
        const currentTx = (await readPublished(
          `pendingTxs.tx${index}`,
        )) as PublishedTx;
        if (currentTx.type === TxType.MAKE_ACCOUNT) {
          // Confirm MakeAccount tx
          await settleTransaction(zoe, resolverMakers, index, 'success');
          index += 1;
        }
      }
      await eventLoopIteration();

      for (const move of moves) {
        await eventLoopIteration();
        if (move.dest === '@Arbitrum') {
          // Also confirm CCTP transaction for flows to Arbitrum
          await settleTransaction(zoe, resolverMakers, index, 'success');
          index += 1;
        }
        if (move.src === '@Arbitrum') {
          await settleTransaction(zoe, resolverMakers, index, 'success');
          index += 1;
          if (move.dest === '@agoric') {
            await transmitVTransferEvent('acknowledgementPacket', -1);
            // Also confirm Noble transaction for flows to Noble
            await settleTransaction(zoe, resolverMakers, index, 'success');
            index += 1;
          }
        }
        try {
          await transmitVTransferEvent('acknowledgementPacket', -1);
        } catch (oops) {
          t.log('nothing to ack?', oops);
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

    const openOnly = Object.keys(scenario.before).length === 0;
    openOnly || previous || Fail`no previous scenario for ${description}`;
    const openResult = await (openOnly
      ? openPortfolioAndAck(scenario.proposal.give, scenario.offerArgs)
      : openPortfolioAndAck(previous!.proposal.give, previous!.offerArgs));

    const { payouts } = await (async () => {
      if (openOnly) return openResult;

      const rebalanceP = trader1.rebalance(
        t,
        scenario.proposal,
        scenario.offerArgs,
      );
      await ackSteps(scenario.offerArgs);
      const result = await rebalanceP;
      return result;
    })();

    const portfolioPath = trader1.getPortfolioPath();
    t.truthy(portfolioPath);

    // not interested in account addresses
    const { accountIdByChain: _1, ...portfolioStatus } =
      await trader1.getPortfolioStatus();

    t.log('after:', portfolioPath, portfolioStatus);

    const txfrs = await trader1.netTransfersByPosition();
    t.log('net transfers by position', txfrs);
    t.deepEqual(txfrs, scenario.after, 'net transfers should match After row');

    t.log('payouts', payouts);
    const { Access: _, ...skipAssets } = payouts;
    t.deepEqual(skipAssets, scenario.payouts, 'payouts');

    // XXX: inspect bridge for netTransfersByPosition chains?
  },
  title(providedTitle = '', description: string) {
    return `${providedTitle} ${description}`.trim();
  },
});

test('scenario:', rebalanceScenarioMacro, 'Open empty portfolio');
test('scenario:', rebalanceScenarioMacro, 'Open portfolio with USDN position');
test('scenario:', rebalanceScenarioMacro, 'Open portfolio with Aave position');
test('scenario:', rebalanceScenarioMacro, 'Recover funds from Noble ICA');
test('scenario:', rebalanceScenarioMacro, 'Open with 3 positions');
test('scenario:', rebalanceScenarioMacro, 'Consolidate to USDN');
test('scenario:', rebalanceScenarioMacro, 'Withdraw some from Compound');
test('scenario:', rebalanceScenarioMacro, 'Aave -> USDN');
// awkward: remote EVM account would exist prior
test.skip('scenario:', rebalanceScenarioMacro, 'remote cash -> Aave');
test('scenario:', rebalanceScenarioMacro, 'Aave -> Compound');
test('scenario:', rebalanceScenarioMacro, 'USDN -> Aave');
test('scenario:', rebalanceScenarioMacro, 'A,C -> U');
test('scenario:', rebalanceScenarioMacro, 'Close out portfolio');
// grok isn't working on this one
test.skip('scenario:', rebalanceScenarioMacro, 'Receive via hook');
// requires internal planner
test.skip('scenario:', rebalanceScenarioMacro, 'Deploy via hook');

const scenariosP = importCSV('./move-cases.csv', import.meta.url).then(data =>
  grokRebalanceScenarios(data),
);

test('list scenarios', async t => {
  const tested = [
    'Open empty portfolio',
    'Open portfolio with USDN position',
    'Open portfolio with Aave position',
    'Recover funds from Noble ICA',
    'Open with 3 positions',
    'Consolidate to USDN',
    'Withdraw some from Compound',
    'Aave -> USDN',
    'Aave -> Compound',
    'USDN -> Aave',
    'A,C -> U',
    'Close out portfolio',
  ];
  const scenarios = await scenariosP;
  const names = Object.keys(scenarios);
  const todo = names.filter(n => !tested.includes(n));
  t.log('tested:', tested.length, 'todo:', todo.length, todo);
  t.true(names.length >= 3);
});
