// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import PROD_NETWORK from '@agoric/portfolio-api/src/network/prod-network.js';
import {
  MIN_AGENT_INSTRUMENT_MOVE_UUSDC,
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

test('agent instrument minimum is 5 USDC and at least five times every transfer minimum', t => {
  t.is(MIN_AGENT_INSTRUMENT_MOVE_UUSDC, 5_000_000n);
  for (const { src, dest, min = 0n } of PROD_NETWORK.links) {
    t.true(
      MIN_AGENT_INSTRUMENT_MOVE_UUSDC >= 5n * min,
      `${src} -> ${dest}: ${min}`,
    );
  }
});

test('rejects withdrawals and deposits at the same instrument in either order', t => {
  for (const instrument of ['Aave_Arbitrum', 'USDN']) {
    const account = instrument === 'USDN' ? '@noble' : '@Arbitrum';
    const withdrawal = step(instrument, account);
    const deposit = step(account, instrument);
    for (const flow of [
      [withdrawal, deposit],
      [deposit, withdrawal],
    ]) {
      for (const order of [undefined, []]) {
        t.throws(
          () => vetFlowPlanPlaces(cosmos('rebalance'), { flow, order }),
          {
            message: /cannot withdraw from and deposit into/,
          },
        );
      }
    }
  }
});

test('chain accounts may send and receive in either direction', t => {
  const flow = [step('@Base', '@Arbitrum'), step('@Arbitrum', '@Base')];
  t.notThrows(() => vetFlowPlanPlaces(evm('rebalance'), flow));
});

test('agent instrument movements require at least 5 USDC per step', t => {
  const context = { ...evm('rebalance'), isAgentFlow: true };
  for (const [src, dest] of [
    ['@Arbitrum', 'Aave_Arbitrum'],
    ['Aave_Arbitrum', '@Arbitrum'],
  ]) {
    for (const value of [0n, 1n, 4_999_999n, 5_000_000n, 5_000_001n]) {
      const movement = {
        ...step(src, dest),
        amount: AmountMath.make(USDC, value),
      };
      if (value < 5_000_000n) {
        t.throws(() => vetFlowPlanPlaces(context, [movement]), {
          message: /agent instrument movement requires at least 5000000/,
        });
      } else {
        t.notThrows(() => vetFlowPlanPlaces(context, [movement]));
      }
      t.notThrows(() => vetFlowPlanPlaces(evm('rebalance'), [movement]));
    }
  }
  // Two small supplies cannot pool their amounts to meet the per-step minimum.
  t.throws(
    () =>
      vetFlowPlanPlaces(context, [
        step('@Arbitrum', 'Aave_Arbitrum'),
        step('@Arbitrum', 'Aave_Arbitrum'),
      ]),
    {
      message: /agent instrument movement requires at least 5000000/,
    },
  );
  t.notThrows(() =>
    vetFlowPlanPlaces(context, [
      { ...step('@Base', '@Arbitrum'), amount: AmountMath.make(USDC, 1n) },
      { ...step('@Arbitrum', '@Base'), amount: AmountMath.make(USDC, 1n) },
    ]),
  );
});

test('agent max and share withdrawals require 5 USDC guaranteed proceeds', t => {
  const context = { ...evm('rebalance'), isAgentFlow: true };
  for (const [src, withdraw] of [
    ['Aave_Arbitrum', { max: true }],
    ['ERC4626_morphoSteakhouseHighYieldUsdc_Arbitrum', { amountOfShares: 10n }],
  ] as const) {
    for (const value of [0n, 4_999_999n, 5_000_000n]) {
      const movement = {
        ...step(src, '@Arbitrum'),
        withdraw,
        amount: AmountMath.make(USDC, value),
      };
      if (value < MIN_AGENT_INSTRUMENT_MOVE_UUSDC) {
        t.throws(() => vetFlowPlanPlaces(context, [movement]), {
          message: /agent instrument movement requires at least 5000000/,
        });
      } else {
        t.notThrows(() => vetFlowPlanPlaces(context, [movement]));
      }
    }
  }
});

test('claiming rewards is not a withdrawal of invested principal', t => {
  const claim = {
    ...step('Aave_Arbitrum', '@Arbitrum'),
    amount: AmountMath.make(USDC, 0n),
    claimRewards: { tokens: [], minAmounts: [] },
  };
  const supply = {
    ...step('@Arbitrum', 'Aave_Arbitrum'),
    amount: AmountMath.make(USDC, 5_000_000n),
  };
  t.notThrows(() =>
    vetFlowPlanPlaces({ ...evm('claimRewards'), isAgentFlow: true }, [
      claim,
      supply,
    ]),
  );
});

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

test('instrument steps stay on the instrument chain', t => {
  // AGO-1656: `@Base -> Aave_Arbitrum` would supply Aave on Base.
  const mismatched: [string, string, RegExp][] = [
    [
      '@Base',
      'Aave_Arbitrum',
      /"Aave_Arbitrum" lives on "Arbitrum", not "Base"/,
    ],
    [
      'Aave_Arbitrum',
      '@Base',
      /"Aave_Arbitrum" lives on "Arbitrum", not "Base"/,
    ],
    [
      '@Avalanche',
      'Compound_Base',
      /"Compound_Base" lives on "Base", not "Avalanche"/,
    ],
    ['@agoric', 'USDN', /"USDN" lives on "noble", not "agoric"/],
  ];
  for (const context of [evm('rebalance'), cosmos('rebalance')]) {
    for (const [src, dest, message] of mismatched) {
      t.throws(() => vetFlowPlanPlaces(context, [step(src, dest)]), {
        message,
      });
    }
  }
});
