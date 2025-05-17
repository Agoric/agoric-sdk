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
  destination: AccountId;
  expected: {
    baseFee?: Amount<'nat'>;
    relayFee?: Amount<'nat'>;
    totalFee: Amount<'nat'>;
    advance: Amount<'nat'>;
    split: {
      ContractFee: Amount<'nat'>;
      PoolFee: Amount<'nat'>;
      RelayFee: Amount<'nat'>;
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
      destination,
      expected,
    }: FeelToolsScenario,
  ) => {
    const { totalFee, advance, split, baseFee, relayFee } = expected;
    const feeTools = makeFeeTools(harden(config));

    const debugString = `expected:\n${q(feeTools.calculateSplit(requested, destination)).toString()}`;
    t.true(
      isEqual(
        totalFee,
        add(add(split.ContractFee, split.PoolFee), split.RelayFee),
      ),
      `sanity check: total fee equals sum of splits. ${debugString}`,
    );
    t.true(
      isEqual(requested, add(totalFee, advance)),
      `sanity check: requested equals advance plus fee. ${debugString}`,
    );

    // Test the new fee calculation methods
    if (baseFee) {
      t.deepEqual(feeTools.calculateBaseFee(requested, destination), baseFee);
    }
    if (relayFee) {
      t.deepEqual(feeTools.calculateRelayFee(destination), relayFee);
    }

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
  destination: 'cosmos:noble-1:noble1testbech32',
  config: {
    ...aFeeConfig,
    variableRate: USDCRatio(0n),
  },
  expected: {
    baseFee: USDC(10n),
    relayFee: USDC(0n),
    totalFee: USDC(10n), // only flat
    advance: USDC(990n),
    split: {
      ContractFee: USDC(2n),
      PoolFee: USDC(8n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'zero flat fee',
  requested: USDC(1000n),
  destination: 'cosmos:noble-1:noble1testbech32',
  config: {
    ...aFeeConfig,
    flat: USDC(0n),
  },
  expected: {
    baseFee: USDC(20n),
    relayFee: USDC(0n),
    totalFee: USDC(20n), // only variable
    advance: USDC(980n),
    split: {
      ContractFee: USDC(4n),
      PoolFee: USDC(16n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'zero fees (free)',
  requested: USDC(100n),
  destination: 'cosmos:noble-1:noble1testbech32',
  config: {
    ...aFeeConfig,
    flat: USDC(0n),
    variableRate: USDCRatio(0n),
  },
  expected: {
    baseFee: USDC(0n),
    relayFee: USDC(0n),
    totalFee: USDC(0n), // no fee charged
    advance: USDC(100n),
    split: {
      ContractFee: USDC(0n),
      PoolFee: USDC(0n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'with relay fee',
  requested: USDC(1000n),
  destination: 'cosmos:noble-1:noble1testbech32',
  config: {
    ...aFeeConfig,
    relay: USDC(5n),
  },
  expected: {
    baseFee: USDC(30n), // 10n flat + 20n variable (2% of 1000n)
    relayFee: USDC(5n),
    totalFee: USDC(35n), // 30n base + 5n relay
    advance: USDC(965n),
    split: {
      ContractFee: USDC(6n), // 6n (20% of 30n base)
      PoolFee: USDC(24n), // 24n (80% of 30n base)
      RelayFee: USDC(5n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_OSMO with commonPrivateArgs.feeConfig',
  // 150_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount),
  destination: 'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
  // same as commonPrivateArgs.feeConfig from `CommonSetup`
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    baseFee: USDC(3000001n), // 1n + 2% of 150USDC
    relayFee: USDC(0n),
    totalFee: USDC(3000001n),
    advance: USDC(146999999n),
    split: {
      ContractFee: USDC(600000n), // 20% of fee
      PoolFee: USDC(2400001n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_DYDX with commonPrivateArgs.feeConfig',
  // 300_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_DYDX().tx.amount),
  destination:
    'cosmos:dydx-mainnet-1:dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
  // same as commonPrivateArgs.feeConfig from `CommonSetup`
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    baseFee: USDC(6000001n), // 1n + 2% of 300USDC
    relayFee: USDC(0n),
    totalFee: USDC(6000001n),
    advance: USDC(293999999n),
    split: {
      ContractFee: USDC(1200000n), // 20% of fee
      PoolFee: USDC(4800001n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_ETHEREUM with commonPrivateArgs.feeConfig',
  // 950_000_000n
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.amount),
  destination: 'eip155:1:0x1234567890123456789012345678901234567890',
  config: makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
  expected: {
    baseFee: USDC(19000001n), // 1n + 2% of 950USDC
    relayFee: USDC(0n),
    totalFee: USDC(19000001n),
    advance: USDC(930999999n),
    split: {
      ContractFee: USDC(3800000n), // 20% of fee
      PoolFee: USDC(15200001n),
      RelayFee: USDC(0n),
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
    baseFee: USDC(19500000n), // 500_000n + 2% of 950USDC
    relayFee: USDC(0n),
    totalFee: USDC(19500000n),
    advance: USDC(930500000n),
    split: {
      ContractFee: USDC(3900000n), // 20% of fee
      PoolFee: USDC(15600000n),
      RelayFee: USDC(0n),
    },
  },
});

test(feeToolsScenario, {
  name: 'AGORIC_PLUS_ETHEREUM with customFeeConfigs including relay',
  requested: USDC(MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM().tx.amount),
  destination: 'eip155:1:0x1234567890123456789012345678901234567890',
  config: {
    ...makeTestFeeConfig(withAmountUtils(issuerKits.USDC)),
    destinationOverrides: {
      'eip155:1': {
        flat: USDC(500_000n),
        relay: USDC(250_000n),
      },
    },
  },
  expected: {
    baseFee: USDC(19500000n), // 500_000n + 2% of 950USDC
    relayFee: USDC(250_000n),
    totalFee: USDC(19750000n), // 19500000n + 250000n
    advance: USDC(930250000n),
    split: {
      ContractFee: USDC(3900000n), // 20% of baseFee (3900000n)
      PoolFee: USDC(15600000n), // 80% of baseFee
      RelayFee: USDC(250_000n),
    },
  },
});

test('request must exceed fees', t => {
  const feeTools = makeFeeTools(aFeeConfig);

  const expectedError = { message: 'Request must exceed fees.' };
  const dest = 'cosmos:noble-1:noble1testbech32';

  for (const requested of [0n, 2n, 10n].map(USDC)) {
    t.throws(
      () => feeTools.calculateAdvanceFee(requested, dest),
      expectedError,
    );
    t.throws(() => feeTools.calculateAdvance(requested, dest), expectedError);
    t.throws(() => feeTools.calculateSplit(requested, dest), expectedError);
  }
  // advance can be smaller than fee
  t.is(feeTools.calculateAdvanceFee(USDC(11n), dest).value, 10n);
});

test('relay fee is only included in contract fee during split', t => {
  const baseConfig = harden({
    ...aFeeConfig,
    variableRate: USDCRatio(1n),
    flat: USDC(100n),
    contractRate: USDCRatio(20n), // 20% of base fee goes to contract
    relay: USDC(500n),
  });

  const feeTools = makeFeeTools(baseConfig);
  const destination = 'cosmos:noble-1:noble1testbech32';
  const requested = USDC(10_000n);

  // Calculate and verify individual components
  const baseFee = feeTools.calculateBaseFee(requested, destination);
  const relayFee = feeTools.calculateRelayFee(destination);
  const totalFee = feeTools.calculateAdvanceFee(requested, destination);
  t.deepEqual(baseFee, USDC(200n));
  t.deepEqual(relayFee, USDC(500n));
  t.deepEqual(totalFee, USDC(700n)); // base + relay

  const split = feeTools.calculateSplit(requested, destination);
  t.deepEqual(
    split.ContractFee,
    USDC(40n), // 20% of 200n base fee (40n)
    'Contract fee should include its share of base fee plus entire relay fee',
  );
  t.deepEqual(
    split.RelayFee,
    USDC(500n),
    'Contract fee should include its share of base fee plus entire relay fee',
  );
  t.deepEqual(
    split.PoolFee,
    USDC(160n), // 80% of 200n base fee = 160n
    'Pool fee should be its share of base fee only',
  );
  t.deepEqual(
    split.Principal,
    USDC(9_300n), // 10_000n - 700n
    'Principal should be requested amount minus total fee',
  );

  const splitAmounts = Object.values(split);
  t.is(splitAmounts.length, 4, 'split has 4 entries');

  t.deepEqual(
    splitAmounts.reduce((sum, amount) => add(sum, amount), USDC(0n)),
    requested,
    'Sum of split equals the requested amount',
  );
});
