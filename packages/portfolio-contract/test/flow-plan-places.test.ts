// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  vetFlowPlanPlaces,
  type FlowPlanContext,
} from '../src/flow-plan-places.ts';
import type { MovementDesc } from '../src/type-guards-steps.ts';

const { brand: USDC } = makeIssuerKit('USDC');
const amount = AmountMath.make(USDC, 1_000_000n);
const step = (src: string, dest: string) =>
  ({ src, dest, amount }) as MovementDesc;

const cosmos = (flowType: FlowPlanContext['flowType']): FlowPlanContext => ({
  flowType,
  isEvmPortfolio: false,
});
const evm = (
  flowType: FlowPlanContext['flowType'],
  chains: Pick<FlowPlanContext, 'fromChain' | 'toChain'> = {},
): FlowPlanContext => ({ flowType, isEvmPortfolio: true, ...chains });

test('accepts plans of a normal shape', t => {
  const cases: [FlowPlanContext, MovementDesc[]][] = [
    [
      cosmos('deposit'),
      [step('<Deposit>', '@agoric'), step('@agoric', '@noble')],
    ],
    [
      cosmos('withdraw'),
      [step('@noble', '@agoric'), step('@agoric', '<Cash>')],
    ],
    [
      evm('deposit', { fromChain: 'Arbitrum' }),
      [step('+Arbitrum', '@Arbitrum'), step('@Arbitrum', 'Aave_Arbitrum')],
    ],
    [
      evm('withdraw', { toChain: 'Arbitrum' }),
      [step('Aave_Arbitrum', '@Arbitrum'), step('@Arbitrum', '-Arbitrum')],
    ],
    [evm('withdraw', { toChain: 'Base' }), [step('@noble', '-Base')]],
    [evm('rebalance'), [step('Aave_Arbitrum', '@Arbitrum')]],
    [cosmos('rebalance'), [step('@agoric', '@noble'), step('@noble', 'USDN')]],
    [evm('claimRewards'), []],
    [
      cosmos('deposit'),
      [step('<Deposit>', '+agoric'), step('+agoric', '@agoric')],
    ],
    [cosmos('rebalance'), [step('+agoric', '@agoric')]],
  ];
  for (const [context, steps] of cases) {
    t.notThrows(
      () => vetFlowPlanPlaces(context, steps),
      steps.map(({ src, dest }) => `${src}->${dest}`).join(),
    );
    t.notThrows(() => vetFlowPlanPlaces(context, { flow: steps }));
  }
});

test('EVM portfolios have no seat', t => {
  for (const flowType of ['rebalance', 'claimRewards', 'withdraw'] as const) {
    t.throws(
      () =>
        vetFlowPlanPlaces(evm(flowType, { toChain: 'Arbitrum' }), [
          step('@agoric', '<Cash>'),
        ]),
      { message: 'EVM portfolio has no seat for "<Cash>"' },
      flowType,
    );
  }
  t.throws(
    () =>
      vetFlowPlanPlaces(evm('deposit', { fromChain: 'Arbitrum' }), [
        step('<Deposit>', '@agoric'),
      ]),
    { message: 'EVM portfolio has no seat for "<Deposit>"' },
  );
});

test('seat places only in the matching flow type', t => {
  for (const flowType of ['rebalance', 'claimRewards', 'deposit'] as const) {
    t.throws(
      () => vetFlowPlanPlaces(cosmos(flowType), [step('@agoric', '<Cash>')]),
      { message: `"<Cash>" not allowed in "${flowType}" flow` },
    );
  }
  for (const flowType of ['rebalance', 'claimRewards', 'withdraw'] as const) {
    t.throws(
      () => vetFlowPlanPlaces(cosmos(flowType), [step('<Deposit>', '@agoric')]),
      { message: `"<Deposit>" not allowed in "${flowType}" flow` },
    );
  }
});

test('seat places only in their direction', t => {
  t.throws(
    () => vetFlowPlanPlaces(cosmos('withdraw'), [step('<Cash>', '@agoric')]),
    { message: '"<Cash>" cannot be a source' },
  );
  t.throws(
    () => vetFlowPlanPlaces(cosmos('deposit'), [step('@agoric', '<Deposit>')]),
    { message: '"<Deposit>" cannot be a destination' },
  );
});

test('EVM owner places only for EVM portfolios', t => {
  t.throws(
    () =>
      vetFlowPlanPlaces(cosmos('withdraw'), [step('@Arbitrum', '-Arbitrum')]),
    { message: 'portfolio has no EVM owner for "-Arbitrum"' },
  );
  t.throws(
    () =>
      vetFlowPlanPlaces(cosmos('deposit'), [step('+Arbitrum', '@Arbitrum')]),
    { message: 'portfolio has no EVM owner for "+Arbitrum"' },
  );
});

test('EVM owner places only in the matching flow type and chain', t => {
  for (const flowType of ['rebalance', 'claimRewards', 'deposit'] as const) {
    t.throws(
      () =>
        vetFlowPlanPlaces(evm(flowType, { fromChain: 'Arbitrum' }), [
          step('@Arbitrum', '-Arbitrum'),
        ]),
      { message: `"-Arbitrum" not allowed in "${flowType}" flow` },
    );
  }
  for (const flowType of ['rebalance', 'claimRewards', 'withdraw'] as const) {
    t.throws(
      () =>
        vetFlowPlanPlaces(evm(flowType, { toChain: 'Arbitrum' }), [
          step('+Arbitrum', '@Arbitrum'),
        ]),
      { message: `"+Arbitrum" not allowed in "${flowType}" flow` },
    );
  }
  t.throws(
    () =>
      vetFlowPlanPlaces(evm('withdraw', { toChain: 'Arbitrum' }), [
        step('@Base', '-Base'),
      ]),
    { message: '"-Base" does not match flow chain "Arbitrum"' },
  );
  t.throws(
    () =>
      vetFlowPlanPlaces(evm('deposit', { fromChain: 'Arbitrum' }), [
        step('+Base', '@Base'),
      ]),
    { message: '"+Base" does not match flow chain "Arbitrum"' },
  );
  t.throws(() => vetFlowPlanPlaces(evm('withdraw'), [step('@Base', '-Base')]), {
    message: '"-Base" does not match flow chain "[undefined]"',
  });
});
