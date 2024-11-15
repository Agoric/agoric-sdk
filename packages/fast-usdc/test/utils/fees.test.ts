import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeFeeTools } from '../../src/utils/fees.js';
import type { FeeConfig } from '../../src/types.js';

const { add, isEqual } = AmountMath;

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
  maxVariable: USDC(100n),
  contractRate: USDCRatio(20n),
};
harden(aFeeConfig);

type FeelToolsScenario = {
  name: string;
  config?: FeeConfig;
  requested: Amount<'nat'>;
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
    { config = aFeeConfig, requested, expected }: FeelToolsScenario,
  ) => {
    const { totalFee, advance, split } = expected;

    t.true(
      isEqual(totalFee, add(split.ContractFee, split.PoolFee)),
      'sanity check: total fee equals sum of splits',
    );
    t.true(
      isEqual(requested, add(totalFee, advance)),
      'sanity check: requested equals advance plus fee',
    );

    const feeTools = makeFeeTools(harden(config));
    t.deepEqual(feeTools.calculateAdvanceFee(requested), totalFee);
    t.deepEqual(feeTools.calculateAdvance(requested), advance);
    t.deepEqual(feeTools.calculateSplit(requested), {
      ...split,
      Principal: advance,
    });
  },
});

test(feeToolsScenario, {
  name: 'below max variable fee',
  requested: USDC(1000n),
  expected: {
    totalFee: USDC(30n), // 10 flat + 20 variable
    advance: USDC(970n),
    split: {
      ContractFee: USDC(6n),
      PoolFee: USDC(24n),
    },
  },
});

test(feeToolsScenario, {
  name: 'above max variable fee',
  requested: USDC(10000n),
  expected: {
    totalFee: USDC(110n), // 10 flat + 100 max
    advance: USDC(9890n),
    split: {
      ContractFee: USDC(22n),
      PoolFee: USDC(88n),
    },
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
  // TODO consider behavior where 0 or undefined means "no fee cap"
  name: 'only flat is charged if `maxVariable: 0`',
  requested: USDC(10000n),
  config: {
    ...aFeeConfig,
    variableRate: USDCRatio(20n),
    maxVariable: USDC(0n),
  },
  expected: {
    totalFee: USDC(10n), // only flat
    advance: USDC(9990n),
    split: {
      ContractFee: USDC(2n),
      PoolFee: USDC(8n),
    },
  },
});

test.only('request must exceed fees', t => {
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
