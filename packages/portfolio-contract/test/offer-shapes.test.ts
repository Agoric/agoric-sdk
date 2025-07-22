/** @file test for ProposalShapes, offerArgs shapes */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { matches, mustMatch } from '@endo/patterns';
import { makeOfferArgsShapes } from '../src/type-guards-steps.ts';
import { makeProposalShapes, PoolKeyShapeExt, PortfolioStatusShape } from '../src/type-guards.ts';

const usdc = withAmountUtils(makeIssuerKit('USDC'));
const { brand: USDC } = usdc;
const bld = withAmountUtils(makeIssuerKit('BLD'));
const { brand: BLD } = bld;

test('ProposalShapes', t => {
  const { brand: Poc26 } = makeIssuerKit('Poc26');
  const shapes = makeProposalShapes(USDC, BLD, Poc26);

  const usdc = (value: bigint) => AmountMath.make(USDC, value);
  const fee = (value: bigint) => AmountMath.make(BLD, value);
  const poc26 = (value: bigint) => AmountMath.make(Poc26, value);
  const cases = harden({
    openPortfolio: {
      pass: {
        noPositions: { give: { Access: poc26(1n) } },
        withDeposit: { give: { Deposit: usdc(123n), Access: poc26(1n) } },
        aaveNeedsGMPFee: {
          give: {
            Deposit: usdc(6123n),
            GmpFee: fee(123n),
            Access: poc26(1n),
          },
        },
        withDepositAndFee: {
          give: {
            Deposit: usdc(10123n),
            GmpFee: fee(7123n),
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
        gmpFeeWrongBrand: {
          give: { GmpFee: usdc(123n), Access: poc26(1n) },
        },
        openTopLevelStray: { give: { Access: poc26(1n) }, extra: 'property' },
      },
    },
    rebalance: {
      pass: {
        deposit: { give: { Deposit: usdc(123n) } },
        depositWithFee: { give: { Deposit: usdc(123n), GmpFee: fee(50n) } },
        withdraw: { want: { Cash: usdc(123n) } },
        withdrawWithFee: {
          want: { Cash: usdc(123n) },
          give: { GmpFee: fee(50n) },
        },
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
  const [amount, fee] = [usdc.make(200n), bld.make(100n)];
  const specimen = harden({
    flow: [{ src: '@noble', dest: '@Ethereum', amount, fee }],
  });
  t.notThrows(() => mustMatch(specimen, shapes.rebalance));
});

test('offerArgs can carry usdnOut', t => {
  const shapes = makeOfferArgsShapes(USDC);
  const [amount, detail] = [usdc.make(200n), { usdnOut: 198n }];
  const specimen = harden({
    flow: [{ src: '@noble', dest: 'USDN', amount, detail }],
  });
  t.notThrows(() => mustMatch(specimen, shapes.rebalance));
});

test('PoolKeyExt shapes accept future pool keys', t => {
  // Future pool keys should match the extensible shape
  const futureKeys = ['Aave_Base', 'Compound_Solana', 'NewProtocol_Ethereum'];
  for (const key of futureKeys) {
    t.true(matches(key, PoolKeyShapeExt), `${key} should match PoolKeyShapeExt`);
  }
  
  // Portfolio status with future keys should match shape
  const statusWithFutureKeys = harden({
    positionKeys: ['Aave_Ethereum', 'Aave_Base', 'NewProtocol_Solana'],
    flowCount: 3,
    accountIdByChain: { agoric: 'agoric123', noble: 'noble456' },
    targetAllocation: { Aave_Base: 3333n, NewProtocol_Solana: 6667n }
  });
  
  t.notThrows(() => mustMatch(statusWithFutureKeys, PortfolioStatusShape));
});

test('numeric position references are rejected', t => {
  const shapes = makeOfferArgsShapes(USDC);
  const amount = usdc.make(200n);
  
  // Numeric position references from old design should be rejected
  const specimenWithNumber = harden({
    flow: [{ src: '@noble', dest: 42, amount }],
  });
  
  t.throws(() => mustMatch(specimenWithNumber, shapes.rebalance), {
    message: /Must match one of/,
  });
});
