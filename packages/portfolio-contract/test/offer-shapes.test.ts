/** @file test ProtosalShapes and OfferArgs shapes */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import { matches } from '@endo/patterns';
import { makeProposalShapes } from '../src/type-guards.ts';
import { q } from '@endo/errors';

test('ProposalShapes', t => {
  const { brand: USDC } = makeIssuerKit('USDC');
  const { brand: Poc24 } = makeIssuerKit('Poc24');
  const shapes = makeProposalShapes(USDC, Poc24);

  const { make } = AmountMath;
  const usdc = (value: bigint) => make(USDC, value);
  const poc24 = (value: bigint) => make(Poc24, value);

  const cases = harden({
    openPortfolio: {
      pass: {
        noPositions: { give: { Access: poc24(1n) } },
        openUSDN: { give: { Deposit: usdc(123n), Access: poc24(1n) } },
        aaveNeedsGMPFee: {
          give: {
            Deposit: usdc(3000n),
            AaveGmp: usdc(123n),
            AaveAccount: usdc(3000n),
            Access: poc24(1n),
          },
        },
        open2: {
          give: {
            Access: poc24(1n),
            USDNSwapIn: usdc(123n),
            Aave: usdc(123n),
            AaveGmp: usdc(123n),
            AaveAccount: usdc(123n),
          },
          want: {},
        },
        open3: {
          give: {
            USDNSwapIn: usdc(123n),
            Aave: usdc(3000n),
            AaveGmp: usdc(123n),
            AaveAccount: usdc(3000n),
            Compound: usdc(1000n),
            CompoundGmp: usdc(3000n),
            CompoundAccount: usdc(3000n),
            Access: poc24(1n),
          },
        },
      },
      fail: {
        noGive: {},
        missingGMPFee: { give: { Aave: usdc(3000n) } },
        noPayouts: { want: { USDNSwapIn: usdc(123n) } },
        strayKW: { give: { X: usdc(1n) } },
        // New negative cases for openPortfolio
        accessWrongBrand: { give: { Access: usdc(1n) } },
        accessZeroValue: { give: { Access: poc24(0n) } },
        usdnWrongBrandWithAccess: {
          give: { USDNSwapIn: poc24(123n), Access: poc24(1n) },
        },
        aaveIncompleteAndAccessOk: {
          give: { Aave: usdc(100n), AaveGmp: usdc(100n), Access: poc24(1n) },
        },
        compoundIncompleteAndAccessOk: {
          give: {
            Compound: usdc(100n),
            CompoundGmp: usdc(100n),
            Access: poc24(1n),
          },
        },
        openTopLevelStray: { give: { Access: poc24(1n) }, extra: 'property' },
      },
    },
    rebalance: {
      pass: {
        deposit: { give: { USDNLock: usdc(123n) } },
        withdraw: { want: { USDNUnlock: usdc(123n) } },
      },
      fail: {
        both: {
          give: { USDNSwapIn: usdc(123n) },
          want: { USDNSwapIn: usdc(123n) },
        },
        // New negative cases for rebalance
        rebalGiveHasAccess: { give: { Access: poc24(1n) } },
        rebalGiveUsdnBadBrand: { give: { USDNSwapIn: poc24(1n) } },
        rebalGiveAaveIncomplete: { give: { Aave: usdc(100n) } },
        rebalWantBadKey: { want: { BogusProtocol: usdc(1n) } },
        rebalWantUsdnBadBrand: { want: { USDNSwapIn: poc24(1n) } },
        rebalEmpty: {},
        rebalGiveTopLevelStray: {
          give: { USDNSwapIn: usdc(1n) },
          extra: 'property',
        },
        rebalWantTopLevelStray: {
          want: { USDNSwapIn: usdc(1n) },
          extra: 'property',
        },
      },
    },
  });
  const { entries } = Object;
  for (const [desc, { pass, fail }] of entries(cases)) {
    for (const [name, proposal] of entries(pass)) {
      t.log(`${desc} ${name}: ${q(proposal)}`);
      // mustMatch() gives better diagnostics than matches()
      t.notThrows(() => mustMatch(proposal, shapes[desc]), name);
    }
    for (const [name, proposal] of entries(fail)) {
      t.log(`!${desc} ${name}: ${q(proposal)}`);
      t.false(matches(proposal, shapes[desc]), name);
    }
  }
});
