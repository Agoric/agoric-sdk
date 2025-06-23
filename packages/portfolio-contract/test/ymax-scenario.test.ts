/**
 * @file ymax contract tests for rebalance scenarios
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import {
  grokRebalanceScenarios,
  importCSV,
  numeral,
  type Dollars,
} from '../tools/rebalance-grok.ts';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import type { YieldProtocol } from '../src/constants.js';
import { objectMap } from '@endo/patterns';
import type { AccountId } from '@agoric/orchestration';
import { AmountMath, type NatAmount } from '@agoric/ertp';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ProposalType } from '../src/type-guards.ts';
import { Nat } from '@endo/nat';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

const bigintReplacer = (_p, v) => (typeof v === 'bigint' ? `${v}` : v);

const obArgs = { destinationEVMChain: 'Ethereum' } as const; // TODO: should be optional

const withFees = (
  give: Record<YieldProtocol, NatAmount>,
  make: (v: bigint) => NatAmount,
) => {
  const [fee50, fee75] = [make(50n), make(75n)];
  const aaveFees = { AaveGmp: fee50, AaveAccount: fee75 };
  const compoundFees = { CompoundGmp: fee50, CompoundAccount: fee75 };
  return {
    ...('Aave' in give ? aaveFees : {}),
    ...('Compound' in give ? compoundFees : {}),
    ...give,
  };
};

const rebalanceScenarioMacro = test.macro({
  async exec(t, description: string) {
    const { trader1, myBalance, common } = await setupTrader(t);
    const scenario = (await scenariosP)[description];
    if (!scenario) return t.fail(`Scenario "${description}" not found`);
    t.log('start', description, 'with', myBalance);

    const { usdc } = common.brands;
    const $ = (amt: Dollars) =>
      multiplyBy(usdc.units(1), parseRatio(numeral(amt), usdc.brand));

    // Convert scenario amounts to ERTP amounts
    const give = objectMap(scenario.proposal.give, a => $(a!));
    const doneP = trader1.openPortfolio(t, withFees(give, usdc.make), obArgs);

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

    const [{ description: topicDesc, storagePath: portfolioPath }] =
      result.publicTopics;
    t.is(topicDesc, 'Portfolio');

    const { storage } = common.bootstrap;
    // not interested in account addresses
    const {
      local: _1,
      noble: _2,
      ...portfolioStatus
    } = storage.getDeserialized(portfolioPath).at(-1) as any;

    t.log('after:', portfolioPath, portfolioStatus);
    const { positionCount } = portfolioStatus as any; // TODO: typed pattern for portfolio status

    const { fromEntries } = Object;
    const range = (n: number) => [...Array(n).keys()];
    const posPaths = range(positionCount).map(
      pIx => `${portfolioPath}.positions.position${pIx + 1}`,
    );
    const netTransfersByProtocol = fromEntries(
      posPaths
        .map(path => storage.getDeserialized(path).at(-1) as any)
        .map(info => [info.protocol, info.netTransfers]),
    );
    t.log('net transfers by protocol', netTransfersByProtocol);
    t.deepEqual(
      netTransfersByProtocol,
      objectMap(scenario.after, $),
      'net transfers should match After row',
    );

    t.log('payouts', payouts);
    t.deepEqual(payouts, objectMap(scenario.payouts, $), 'payouts');

    // TODO: inspect bridge for correct flow to remote chains?
  },
  title(providedTitle = '', description: string) {
    return `${providedTitle} ${description}`.trim();
  },
});

test('rebalance scenario:', rebalanceScenarioMacro, 'Open empty portfolio');

const scenariosP = importCSV('./rebalance-cases.csv', import.meta.url).then(
  data => grokRebalanceScenarios(data),
);
