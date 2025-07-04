/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { q } from '@endo/errors';
import { objectMap } from '@endo/patterns';
import { type PortfolioKit } from '../src/portfolio.exo.ts';
import { wayFromSrcToDesc } from '../src/run-flow.ts';
import { type OfferArgsFor, type ProposalType } from '../src/type-guards.ts';
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

test('wayFromSrcToDesc handles 1 scenario', async t => {
  const scenario = (await scenariosP)['Open portfolio with USDN position'];

  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const { offerArgs: args } = withBrand(scenario, usdc.brand);

  const reader = harden({
    getPosition: _id => harden({ getYieldProtocol: () => 'USDN' }),
  }) as unknown as PortfolioKit['reader'];

  assert('flow' in args);
  const actual = (args?.flow || []).map(m => wayFromSrcToDesc(m, reader));

  t.deepEqual(actual, ['localTransfer', 'transfer', 'USDN']);
});

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const { [description]: scenario } = await scenariosP;
    if (!scenario) return t.fail(`Scenario ${q(description)} not found`);
    t.log('start', description, 'with', myBalance);

    const { usdc } = common.brands;
    const s2 = withBrand(scenario, usdc.brand);

    const $ = (amt: Dollars) =>
      multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

    const openPortfolio = async (
      give: ProposalType['openPortfolio']['give'],
      offerArgs: OfferArgsFor['openPortfolio'],
    ) => {
      const doneP = trader1.openPortfolio(t, give, offerArgs);

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
    const openOnly = Object.keys(s2.before).length === 0;

    // ??? const isEVM = 'Aave' in give || 'Compound' in give;
    const openResult = await openPortfolio(
      openOnly ? s2.proposal.give : s2.before,
      s2.offerArgs,
    );
    const { result, payouts } = await (openOnly
      ? openResult
      : trader1.rebalance(t, s2.proposal, s2.offerArgs));

    const portfolioPath = trader1.getPortfolioPath();
    t.truthy(portfolioPath);

    const { storage } = common.bootstrap;
    // not interested in account addresses
    const { assetIdByChain: _1, ...portfolioStatus } =
      trader1.getPortfolioStatus(storage);

    t.log('after:', portfolioPath, portfolioStatus);

    const txfrs = trader1.netTransfersByProtocol(storage);
    t.log('net transfers by protocol', txfrs);
    t.deepEqual(
      txfrs,
      objectMap(scenario.after, $),
      'net transfers should match After row',
    );

    t.log('payouts', payouts);
    t.log('expected payouts', s2.payouts);
    const { Access: _, ...skipAccess } = payouts;
    t.deepEqual(skipAccess, objectMap(scenario.payouts, $), 'payouts');

    // TODO: inspect bridge for correct flow to remote chains?
  },
  title(providedTitle = '', description: string) {
    return `${providedTitle} ${description}`.trim();
  },
});

test('scenario:', rebalanceScenarioMacro, 'Open empty portfolio');
test('scenario:', rebalanceScenarioMacro, 'Open portfolio with USDN position');
test.skip('scenario:', rebalanceScenarioMacro, 'Aave -> USDN');

const scenariosP = importCSV('./move-cases.csv', import.meta.url).then(data =>
  harden(grokRebalanceScenarios(data)),
);
