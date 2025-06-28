/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, type NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { mustMatch } from '@agoric/store';
import {
  makeFakeStorageKit,
  withAmountUtils,
} from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { makeMarshal } from '@endo/marshal';
import { Far } from '@endo/pass-style';
import { objectMap } from '@endo/patterns';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import { applyProRataStrategyTo, interpretFlowDesc } from '../src/run-flow.ts';
import {
  makeOfferArgsShapes,
  makeProposalShapes,
  type MovementDesc,
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
import { q } from '@endo/errors';

const makeOfferArgs = (
  offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>,
  scenario: RebalanceScenario,
  $: (d: Dollars) => NatAmount,
  isEVM: boolean,
) => {
  const { flow } = scenario.offerArgs || {};
  const offerArgs = {
    flow: (flow || []).map(
      move => ({ ...move, amount: $(move.amount) }) as MovementDesc,
    ),
    ...(isEVM ? { destinationEVMChain: 'Base' as const } : {}),
  };
  harden(offerArgs);
  console.debug(offerArgs);
  mustMatch(offerArgs, offerArgsShapes.openPortfolio);
  return offerArgs;
};

test('interpretFlowDesc handles 1 scenario', async t => {
  const scenario = (await scenariosP)['Open portfolio with USDN position'];

  const zone = makeHeapZone();
  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const $ = (amt: Dollars) =>
    multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

  const offerArgsShapes = makeOfferArgsShapes(usdc.brand);
  const args = makeOfferArgs(offerArgsShapes, scenario, $, false);

  const makeAccount = <C extends string>(value, chainId: C) =>
    Far(chainId, {
      getAddress: () => ({ value, chainId }),
    });
  const lca = makeAccount(localAccount0, 'agoric-3' as const);
  const ica = makeAccount('noble1deadbeef', 'noble-1' as const);

  const marshaller = makeMarshal();
  const storage = makeFakeStorageKit('root');
  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: null as any,
    vowTools: null as any,
    axelarChainsMap: null as any,
    timer: null as any,
    rebalance: null as any,
    proposalShapes: makeProposalShapes(usdc.brand),
    offerArgsShapes,
    marshaller,
    portfoliosNode: storage.rootNode,
    usdcBrand: usdc.brand,
  });
  const kit = makePortfolioKit({
    portfolioId: 1,
    localAccount: lca as any,
    nobleAccount: ica as any,
  });

  const actual = interpretFlowDesc(args.flow, kit, null as any);

  const pos = kit.manager.provideUSDNPosition();
  const seatDeposit = { keyword: 'Deposit', seat: null };
  const amount = $('$3,333');
  t.deepEqual(actual, [
    { how: 'localTransfer', src: seatDeposit, dest: { account: lca }, amount },
    { how: 'transfer', src: { account: lca }, dest: { account: ica }, amount },
    { how: 'USDN', src: { account: ica }, dest: { pos }, amount },
  ]);

  await eventLoopIteration();
  t.deepEqual(
    [...storage.data.keys()],
    ['root.portfolio1', 'root.portfolio1.positions.position1'],
    'a position was allocated and published in vstorage',
  );
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

  const agoricLCA = 'cosmos:agoric-3:agoric1sdlfj';
  const nobleICA = 'cosmos:noble-1:noble1rgsrsdlfj';
  const evmAcct = 'eip155:xyz:0xDEADBEEF';

  const prev: MovementDesc[] = [
    { amount: $('$10,000'), src: 'Deposit', dest: agoricLCA },
    { amount: $('$10,000'), src: agoricLCA, dest: nobleICA },
    { amount: $('$3,333.33'), src: nobleICA, dest: { open: 'USDN' } },
    { amount: $('$6,666.67'), src: nobleICA, dest: evmAcct },
    { amount: $('$3,333.33'), src: evmAcct, dest: { open: 'Compound' } },
    { amount: $('$3,333.33'), src: evmAcct, dest: { open: 'Aave' } },
  ];

  t.deepEqual(
    applyProRataStrategyTo($('$10,000'), prev, agoricLCA),
    prev.slice(1),
  );
  const actual: MovementDesc[] = applyProRataStrategyTo(
    $('$100'),
    prev,
    agoricLCA,
  );
  t.deepEqual(actual, [
    { amount: $('$100'), src: agoricLCA, dest: nobleICA },
    { amount: $('$33.3333'), src: nobleICA, dest: { open: 'USDN' } },
    { amount: $('$66.6667'), src: nobleICA, dest: evmAcct },
    { amount: $('$33.3333'), src: evmAcct, dest: { open: 'Compound' } },
    { amount: $('$33.3333'), src: evmAcct, dest: { open: 'Aave' } },
  ]);
});
