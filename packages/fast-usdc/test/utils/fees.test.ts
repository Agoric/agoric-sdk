import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath, type Amount } from '@agoric/ertp';
import { makeRatio, makeRatioFromAmounts } from '@agoric/ertp/src/ratio.js';
import {
  withAmountUtils,
  type AmountUtils,
} from '@agoric/zoe/tools/test-utils.js';
import { q } from '@endo/errors';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/tools/mock-evidence.js';
import type { AccountId } from '@agoric/orchestration';
import { makeFeeTools } from '../../src/utils/fees.js';
import type { FeeConfig } from '../../src/types.js';

const { add, isEqual } = AmountMath;

const makeTestFeeConfig = (usdc: Omit<AmountUtils, 'mint'>): FeeConfig =>
  harden({
    flat: usdc.make(1n),
    variableRate: makeRatio(2n, usdc.brand),
    contractRate: makeRatio(20n, usdc.brand),
  });

const issuerKits = {
  USDC: makeIssuerKit<'nat'>('USDC'),
};
const { brand: usdcBrand } = issuerKits.USDC;

const USDC = (value: bigint) => AmountMath.make(usdcBrand, value);
const USDCRatio = (numerator: bigint, denominator: bigint = 100n) =>
  makeRatioFromAmounts(USDC(numerator), USDC(denominator));

const aFeeConfig: FeeConfig = {
  flat: USDC(10n),
  variableRate: USDCRatio(2n),
  contractRate: USDCRatio(20n),
};
harden(aFeeConfig);

type FeelToolsScenario = {
  name: string;
  config?: FeeConfig;
  requested: Amount<'nat'>;
  destination?: AccountId;
  expected: {
    totalFee: Amount<'nat'>;
    advance: Amount<'nat'>;
    split: {
      ContractFee: Amount<'nat'>;
      PoolFee: Amount<'nat'>;
    };
  };
};

const feeToolsScenario = test.macro({
  title: (_, { name }: FeelToolsScenario) => `fee calcs: ${name}`,
  exec: (
    t,
    {
      config = aFeeConfig,
      requested,
      destination = undefined,
      expected,
    }: FeelToolsScenario,
  ) => {
    const { totalFee, advance, split } = expected;
    const feeTools = makeFeeTools(harden(config));

    const debugString = `expected:\n${q(feeTools.calculateSplit(requested, destination)).toString()}`;
    t.true(
      isEqual(totalFee, add(split.ContractFee, split.PoolFee)),
      `sanity check: total fee equals sum of splits. ${debugString}`,
    );
    t.true(
      isEqual(requested, add(totalFee, advance)),
      `sanity check: requested equals advance plus fee. ${debugString}`,
    );

    t.deepEqual(feeTools.calculateAdvanceFee(requested, destination), totalFee);
    t.deepEqual(feeTools.calculateAdvance(requested, destination), advance);
    t.deepEqual(feeTools.calculateSplit(requested, destination), {
      ...split,
      Principal: advance,
    });
  },
});

test(feeToolsScenario, {
  name: 'zero variable fee',
  requested: USDC(1000n),
  config: {
    ...aFeeConfig,
    variableRate: USDCRatio(0n),
  },
  expected: {
    totalFee: USDC(10n), // only flat
    advance: USDC(990n),
    split: {
      ContractFee: USDC(2n),
      PoolFee: USDC(8n),
    },
  },
});

test(feeToolsScenario, {
  name: 'zero flat fee',
  requested: USDC(1000n),
  config: {
    ...aFeeConfig,
    flat: USDC(0n),
  },
  expected: {
    totalFee: USDC(20n), // only variable
    advance: USDC(980n),
    split: {
      ContractFee: USDC(4n),
      PoolFee: USDC(16n),
    },
  },
});

test(feeToolsScenario, {
  name: 'zero fees (free)',
  requested: USDC(100n),
  config: {
    ...aFeeConfig,
    flat: USDC(0n),
    variableRate: USDCRatio(0n),
  },
  expected: {
    totalFee: USDC(0n), // no fee charged
    advance: USDC(100n),
    split: {
      ContractFee: USDC(0n),
      PoolFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_OSMO with commonPrivateArgs.feeConfig',
  // 150_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount),
  // same as commonPrivateArgs.feeConfig from `CommonSetup`
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    totalFee: USDC(3000001n), // 1n + 2% of 150USDC
    advance: USDC(146999999n),
    split: {
      ContractFee: USDC(600000n), // 20% of fee
      PoolFee: USDC(2400001n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_DYDX with commonPrivateArgs.feeConfig',
  // 300_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.amount),
  // same as commonPrivateArgs.feeConfig from `CommonSetup`
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    totalFee: USDC(6000001n), // 1n + 2% of 300USDC
    advance: USDC(293999999n),
    split: {
      ContractFee: USDC(1200000n), // 20% of fee
      PoolFee: USDC(4800001n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_ETHEREUM with commonPrivateArgs.feeConfig',
  // 950_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.amount),
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    totalFee: USDC(19000001n), // 1n + 2% of 950USDC
    advance: USDC(930999999n),
    split: {
      ContractFee: USDC(3800000n), // 20% of fee
      PoolFee: USDC(15200001n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_ETHEREUM with customFeeConfigs',
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.amount),
  destination: 'eip155:1:0x1234567890123456789012345678901234567890',
  config: {
    ...makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
    destinationOverrides: {
      'eip155:1': {
        flat: USDC(500_000n),
      },
    },
  },
  expected: {
    totalFee: USDC(19500000n), // 500_000n + 2% of 950USDC
    advance: USDC(930500000n),
    split: {
      ContractFee: USDC(3900000n), // 20% of fee
      PoolFee: USDC(15600000n),
    },
  },
});

test('request must exceed fees', t => {
  const feeTools = makeFeeTools(aFeeConfig);

  const expectedError = { message: 'Request must exceed fees.' };

  for (const requested of [0n, 2n, 10n].map(USDC)) {
    t.throws(() => feeTools.calculateAdvanceFee(requested), expectedError);
    t.throws(() => feeTools.calculateAdvance(requested), expectedError);
    t.throws(() => feeTools.calculateSplit(requested), expectedError);
  }
  // advance can be smaller than fee
  t.is(feeTools.calculateAdvanceFee(USDC(11n)).value, 10n);
});
