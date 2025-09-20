/** @file test for ProposalShapes, offerArgs, vstorage shapes */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { matches, mustMatch } from '@endo/patterns';
import { makeOfferArgsShapes } from '../src/type-guards-steps.ts';
import {
  FlowStatusShape,
  FlowStepsShape,
  makeProposalShapes,
  PoolKeyShapeExt,
  PortfolioStatusShapeExt,
  PositionStatusShape,
  type StatusFor,
} from '../src/type-guards.ts';

const usdcKit = withAmountUtils(makeIssuerKit('USDC'));
const usdc = usdcKit.make;
const { brand: USDC } = usdcKit;
const bld = withAmountUtils(makeIssuerKit('BLD'));

test('ProposalShapes', t => {
  const { brand: Poc26 } = makeIssuerKit('Poc26');
  const shapes = makeProposalShapes(USDC, Poc26);

  const poc26 = (value: bigint) => AmountMath.make(Poc26, value);
  const cases = harden({
    openPortfolio: {
      pass: {
        noPositions: { give: { Access: poc26(1n) } },
        withDeposit: { give: { Deposit: usdc(123n), Access: poc26(1n) } },
        aaveGMPFeePaidByContract: {
          give: {
            Deposit: usdc(6123n),
            Access: poc26(1n),
          },
        },
        withDepositAndAccess: {
          give: {
            Deposit: usdc(10123n),
            Access: poc26(1n),
          },
        },
      },
      fail: {
        noGive: {},
        noPayouts: { want: { Cash: usdc(123n) } },
        strayKW: { give: { X: usdc(1n) } },
        accessWrongBrand: { give: { Access: usdc(1n) } },
        accessZeroValue: { give: { Access: poc26(0n) } },
        depositWrongBrand: {
          give: { Deposit: poc26(123n), Access: poc26(1n) },
        },
        openTopLevelStray: { give: { Access: poc26(1n) }, extra: 'property' },
      },
    },
    rebalance: {
      pass: {
        deposit: { give: { Deposit: usdc(123n) } },
        withdraw: { want: { Cash: usdc(123n) } },
      },
      fail: {
        both: { give: { Deposit: usdc(123n) }, want: { Cash: usdc(123n) } },
        rebalGiveHasAccess: { give: { Access: poc26(1n) } },
        rebalGiveDepositBadBrand: { give: { Deposit: poc26(1n) } },
        rebalGiveFeeBadBrand: { give: { GmpFee: usdc(1n) } },
        rebalWantCashBadBrand: { want: { Cash: poc26(1n) } },
        rebalEmpty: {},
        rebalGiveTopLevelStray: {
          give: { Deposit: usdc(1n) },
          extra: 'property',
        },
        rebalWantTopLevelStray: {
          want: { Cash: usdc(1n) },
          extra: 'property',
        },
      },
    },
  });
  const { entries } = Object;
  for (const [desc, { pass, fail }] of entries(cases)) {
    t.log(desc, 'good:', Object.keys(pass).join(', '));
    t.log(desc, 'bad:', Object.keys(fail).join(', '));
    for (const [name, proposal] of entries(pass)) {
      // t.log(`${desc} ${name}: ${q(proposal)}`);
      // mustMatch() gives better diagnostics than matches()
      t.notThrows(() => mustMatch(proposal, shapes[desc]), name);
    }
    for (const [name, proposal] of entries(fail)) {
      // t.log(`!${desc} ${name}: ${q(proposal)}`);
      t.false(matches(proposal, shapes[desc]), name);
    }
  }
});

test('offerArgs can carry fee', t => {
  const shapes = makeOfferArgsShapes(USDC);
  const [amount, fee] = [usdc(200n), bld.make(100n)];
  const specimen = harden({
    flow: [{ src: '@noble', dest: '@Arbitrum', amount, fee }],
  });
  t.notThrows(() => mustMatch(specimen, shapes.rebalance));
});

test('offerArgs can carry usdnOut', t => {
  const shapes = makeOfferArgsShapes(USDC);
  const [amount, detail] = [usdc(200n), { usdnOut: 198n }];
  const specimen = harden({
    flow: [{ src: '@noble', dest: 'USDN', amount, detail }],
  });
  t.notThrows(() => mustMatch(specimen, shapes.rebalance));
});

test('PoolKeyExt shapes accept future pool keys', t => {
  // Future pool keys should match the extensible shape
  const futureKeys = ['Aave_Base', 'Compound_Solana', 'NewProtocol_Ethereum'];
  for (const key of futureKeys) {
    t.true(
      matches(key, PoolKeyShapeExt),
      `${key} should match PoolKeyShapeExt`,
    );
  }

  // Portfolio status with future keys should match shape
  const statusWithFutureKeys = harden({
    positionKeys: ['Aave_Ethereum', 'Aave_Base', 'NewProtocol_Solana'],
    flowCount: 3,
    accountIdByChain: { agoric: 'agoric123', noble: 'noble456' },
    targetAllocation: { Aave_Base: 3333n, NewProtocol_Solana: 6667n },
    policyVersion: 1,
    rebalanceCount: 1,
  });

  t.notThrows(() => mustMatch(statusWithFutureKeys, PortfolioStatusShapeExt));
});

test('numeric position references are rejected', t => {
  const shapes = makeOfferArgsShapes(USDC);
  const amount = usdc(200n);

  // Numeric position references from old design should be rejected
  const specimenWithNumber = harden({
    flow: [{ src: '@noble', dest: 42, amount }],
  });

  t.throws(() => mustMatch(specimenWithNumber, shapes.rebalance), {
    message: /Must match one of/,
  });
});

test('vstorage flow type matches shape', t => {
  const passCases: Record<string, StatusFor['flow']> = harden({
    runningFlow: {
      state: 'run',
      step: 1,
      how: 'deposit',
    },
    undoingFlow: {
      state: 'undo',
      step: 2,
      how: 'withdraw',
    },
    completedFlow: {
      state: 'done',
    },
    failedFlow: {
      state: 'fail',
      step: 0,
      how: 'transfer',
      error: 'Insufficient funds',
    },
    failedFlowWithLocation: {
      state: 'fail',
      step: 1,
      how: 'deposit',
      error: 'Network timeout',
      where: '@Arbitrum',
    },
  });

  const failCases = harden({
    missingState: {
      step: 1,
      how: 'deposit',
    },
    invalidState: {
      state: 'invalid',
      step: 1,
      how: 'deposit',
    },
    runMissingStep: {
      state: 'run',
      how: 'deposit',
    },
    runMissingHow: {
      state: 'run',
      step: 1,
    },
    failMissingError: {
      state: 'fail',
      step: 1,
      how: 'deposit',
    },
  });

  const { entries } = Object;
  for (const [name, flowStatus] of entries(passCases)) {
    t.notThrows(() => mustMatch(flowStatus, FlowStatusShape), `pass: ${name}`);
  }
  for (const [name, flowStatus] of entries(failCases)) {
    t.false(matches(flowStatus, FlowStatusShape), `fail: ${name}`);
  }
});

test('vstorage flow steps type matches shape', t => {
  const passCases: Record<string, StatusFor['flowSteps']> = harden({
    emptySteps: [],
    singleStep: [
      {
        how: 'deposit',
        amount: usdc(1000n),
        src: '<Deposit>',
        dest: '@noble',
      },
    ],
    multipleSteps: [
      {
        how: 'transfer',
        amount: usdc(2000n),
        src: '@noble',
        dest: '@Arbitrum',
      },
      {
        how: 'deposit',
        amount: usdc(1800n),
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
      },
    ],
  });

  const failCases = harden({
    missingHow: [
      {
        amount: usdc(1000n),
        src: '<Deposit>',
        dest: '@noble',
      },
    ],
    missingAmount: [
      {
        how: 'deposit',
        src: '<Deposit>',
        dest: '@noble',
      },
    ],
    missingSrc: [
      {
        how: 'deposit',
        amount: usdc(1000n),
        dest: '@noble',
      },
    ],
    missingDest: [
      {
        how: 'deposit',
        amount: usdc(1000n),
        src: '<Deposit>',
      },
    ],
  });

  const { entries } = Object;
  for (const [name, flowSteps] of entries(passCases)) {
    t.notThrows(() => mustMatch(flowSteps, FlowStepsShape), `pass: ${name}`);
  }
  for (const [name, flowSteps] of entries(failCases)) {
    t.false(matches(flowSteps, FlowStepsShape), `fail: ${name}`);
  }
});

test('vstorage position type matches shape', t => {
  const passCases: Record<string, StatusFor['position']> = harden({
    usdnPosition: {
      protocol: 'USDN',
      accountId: 'cosmos:noble-1:noble1234567890abcdef1234567890abcdef12345678',
      netTransfers: usdc(1000n),
      totalIn: usdc(2000n),
      totalOut: usdc(1000n),
    },
    aavePosition: {
      protocol: 'Aave',
      accountId: 'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
      netTransfers: usdc(500n),
      totalIn: usdc(1500n),
      totalOut: usdc(1000n),
    },
    compoundPosition: {
      protocol: 'Compound',
      accountId: 'eip155:42161:0x456def1234567890abcdef1234567890abcdef12',
      netTransfers: usdc(0n),
      totalIn: usdc(1000n),
      totalOut: usdc(1000n),
    },
    beefyPosition: {
      protocol: 'Beefy',
      accountId: 'eip155:8453:0x789ghi1234567890abcdef1234567890abcdef12',
      netTransfers: usdc(2000n),
      totalIn: usdc(3000n),
      totalOut: usdc(1000n),
    },
  });

  const failCases = harden({
    missingProtocol: {
      accountId: 'cosmos:noble-1:noble1234567890abcdef1234567890abcdef12345678',
      netTransfers: usdc(1000n),
      totalIn: usdc(2000n),
      totalOut: usdc(1000n),
    },
    invalidProtocol: {
      protocol: 'InvalidProtocol',
      accountId: 'cosmos:noble-1:noble1234567890abcdef1234567890abcdef12345678',
      netTransfers: usdc(1000n),
      totalIn: usdc(2000n),
      totalOut: usdc(1000n),
    },
    missingAccountId: {
      protocol: 'USDN',
      netTransfers: usdc(1000n),
      totalIn: usdc(2000n),
      totalOut: usdc(1000n),
    },
  });

  const { entries } = Object;
  for (const [name, position] of entries(passCases)) {
    t.notThrows(
      () => mustMatch(position, PositionStatusShape),
      `pass: ${name}`,
    );
  }
  for (const [name, position] of entries(failCases)) {
    t.false(matches(position, PositionStatusShape), `fail: ${name}`);
  }
});
