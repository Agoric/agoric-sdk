import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { q } from '@endo/errors';
import { matches, mustMatch } from '@endo/patterns';
import { makeProposalShapes0 } from '../src/type-guards.ts';

test('ProposalShapes', t => {
  const { brand: USDC } = makeIssuerKit('USDC');
  const { brand: Poc26 } = makeIssuerKit('Poc26');
  const shapes = makeProposalShapes0(USDC, Poc26);

  const usdc = (value: bigint) => AmountMath.make(USDC, value);
  const poc26 = (value: bigint) => AmountMath.make(Poc26, value);
  const cases = harden({
    openPortfolio: {
      pass: {
        noPositions: { give: { Access: poc26(1n) } },
        openUSDN: { give: { USDN: usdc(123n), Access: poc26(1n) } },
        aaveNeedsGMPFee: {
          give: {
            AaveGmp: usdc(123n),
            Aave: usdc(3000n),
            AaveAccount: usdc(3000n),
            Access: poc26(1n),
          },
        },
        open3: {
          give: {
            USDN: usdc(123n),
            Aave: usdc(3000n),
            AaveGmp: usdc(123n),
            AaveAccount: usdc(3000n),
            Compound: usdc(1000n),
            CompoundGmp: usdc(3000n),
            CompoundAccount: usdc(3000n),
            Access: poc26(1n),
          },
        },
      },
      fail: {
        noGive: {},
        missingGMPFee: { give: { Aave: usdc(3000n) } },
        noPayouts: { want: { USDN: usdc(123n) } },
        strayKW: { give: { X: usdc(1n) } },
        // New negative cases for openPortfolio
        accessWrongBrand: { give: { Access: usdc(1n) } },
        accessZeroValue: { give: { Access: poc26(0n) } },
        usdnWrongBrandWithAccess: {
          give: { USDN: poc26(123n), Access: poc26(1n) },
        },
        aaveIncompleteAndAccessOk: {
          give: { Aave: usdc(100n), AaveGmp: usdc(100n), Access: poc26(1n) },
        },
        compoundIncompleteAndAccessOk: {
          give: {
            Compound: usdc(100n),
            CompoundGmp: usdc(100n),
            Access: poc26(1n),
          },
        },
        openTopLevelStray: { give: { Access: poc26(1n) }, extra: 'property' },
      },
    },
    rebalance: {
      pass: {
        deposit: { give: { USDN: usdc(123n) } },
        withdraw: { want: { USDN: usdc(123n) } },
      },
      fail: {
        both: { give: { USDN: usdc(123n) }, want: { USDN: usdc(123n) } },
        // New negative cases for rebalance
        rebalGiveHasAccess: { give: { Access: poc26(1n) } },
        rebalGiveUsdnBadBrand: { give: { USDN: poc26(1n) } },
        rebalGiveAaveIncomplete: { give: { Aave: usdc(100n) } },
        rebalWantBadKey: { want: { BogusProtocol: usdc(1n) } },
        rebalWantUsdnBadBrand: { want: { USDN: poc26(1n) } },
        rebalEmpty: {},
        rebalGiveTopLevelStray: {
          give: { USDN: usdc(1n) },
          extra: 'property',
        },
        rebalWantTopLevelStray: {
          want: { USDN: usdc(1n) },
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
