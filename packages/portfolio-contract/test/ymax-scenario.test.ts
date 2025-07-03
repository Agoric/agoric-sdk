/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, type NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { mustMatch } from '@agoric/store';
import {
  makeFakeStorageKit,
  withAmountUtils,
} from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { q } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';
import { Far } from '@endo/pass-style';
import { objectMap } from '@endo/patterns';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import { applyProRataStrategyTo, wayFromSrcToDesc } from '../src/run-flow.ts';
import {
  makeOfferArgsShapes,
  makeProposalShapes,
  type LocalAccount,
  type MovementDesc,
  type NobleAccount,
  type OfferArgsFor,
  type ProposalType,
} from '../src/type-guards.ts';
import {
  grokRebalanceScenarios,
  importCSV,
  numeral,
  type Dollars,
  type RebalanceScenario,
} from '../tools/rebalance-grok.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import { localAccount0 } from './mocks.ts';

const makeOfferArgs = (
  offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>,
  scenario: RebalanceScenario,
  $: (d: Dollars) => NatAmount,
  isEVM: boolean,
): OfferArgsFor['rebalance'] => {
  const { flow } = scenario.offerArgs || {};
  const offerArgs = {
    flow: (flow || []).map(
      move => ({ ...move, amount: $(move.amount) }) as MovementDesc,
    ),
    ...(isEVM ? { destinationEVMChain: 'Base' as const } : {}),
  };
  harden(offerArgs);
  // console.debug(offerArgs);
  mustMatch(offerArgs, offerArgsShapes.openPortfolio);
  return offerArgs;
};

test('wayFromSrcToDesc handles 1 scenario', async t => {
  const scenario = (await scenariosP)['Open portfolio with USDN position'];

  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const $ = (amt: Dollars) =>
    multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

  const offerArgsShapes = makeOfferArgsShapes(usdc.brand);
  const args = makeOfferArgs(offerArgsShapes, scenario, $, false);

  const reader = harden({
    getPosition: _id => harden({ getYieldProtocol: () => 'USDN' }),
  }) as unknown as PortfolioKit['reader'];

  assert('flow' in args);
  const actual = args.flow.map(m => wayFromSrcToDesc(m, reader));

  t.deepEqual(actual, ['localTransfer', 'transfer', 'USDN']);
});

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const scenario = (await scenariosP)[description];
    if (!scenario) return t.fail(`Scenario ${q(description)} not found`);
    t.log('start', description, 'with', myBalance);

    const { usdc } = common.brands;
    const $ = (amt: Dollars) =>
      multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

    const u1 = usdc.make(1n);

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
    const give = objectMap(scenario.proposal.give, a => $(a!));
    const want = objectMap(scenario.proposal.want, a => $(a!));
    const before = objectMap(scenario.before, a => $(a!));
    const openOnly = Object.keys(before).length === 0;

    const offerArgsShapes = makeOfferArgsShapes(usdc.brand);
    const isEVM = 'Aave' in give || 'Compound' in give;
    const offerArgs = makeOfferArgs(offerArgsShapes, scenario, $, isEVM);
    const openResult = await openPortfolio(openOnly ? give : before, offerArgs);
    const { result, payouts } = await (openOnly
      ? openResult
      : trader1.rebalance(t, { give, want }, offerArgs));

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
    const { Access: _, ...skipAssets } = payouts;
    t.deepEqual(skipAssets, objectMap(scenario.payouts, $), 'payouts');

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
  grokRebalanceScenarios(data),
);

test('use flow/path by reference', t => {
  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const $ = (amt: Dollars) =>
    multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

  // const scenario = (await scenariosP)['Open with 3 positions']

  const agoricAcct = 'agoric.makeAccount()';
  const nobleAcct = 'noble.makeAccount()';
  const evmAcct = 'base.makeAccount()';

  const prev: MovementDesc[] = [
    { amount: $('$10,000'), src: 'Deposit', dest: agoricAcct },
    { amount: $('$10,000'), src: agoricAcct, dest: nobleAcct },
    { amount: $('$3,333.33'), src: nobleAcct, dest: { open: 'USDN' } },
    { amount: $('$6,666.67'), src: nobleAcct, dest: evmAcct },
    { amount: $('$3,333.33'), src: evmAcct, dest: { open: 'Compound' } },
    { amount: $('$3,333.33'), src: evmAcct, dest: { open: 'Aave' } },
  ];

  t.deepEqual(
    applyProRataStrategyTo($('$10,000'), prev, agoricAcct),
    prev.slice(1),
  );
  const actual: MovementDesc[] = applyProRataStrategyTo(
    $('$100'),
    prev,
    agoricAcct,
  );
  t.deepEqual(actual, [
    { amount: $('$100'), src: agoricAcct, dest: nobleAcct },
    { amount: $('$33.3333'), src: nobleAcct, dest: { open: 'USDN' } },
    { amount: $('$66.6667'), src: nobleAcct, dest: evmAcct },
    { amount: $('$33.3333'), src: evmAcct, dest: { open: 'Compound' } },
    { amount: $('$33.3333'), src: evmAcct, dest: { open: 'Aave' } },
  ]);
});
