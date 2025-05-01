/** @file test EVM dest fees vs. examples from product spreadsheet */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { makeRatio, multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import type { FeeConfig } from '@agoric/fast-usdc';
import { DestinationOverridesShape } from '@agoric/fast-usdc/src/type-guards.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import type { AccountId } from '@agoric/orchestration';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';
import {
  config as evmConfig,
  externalConfigContext,
} from '../../src/upgrade-evm-dests.core.js';
import { fromExternalConfig } from '../../src/utils/config-marshal.js';

type Dollars = `$${string}`;
const numeral = (amt: Dollars) => amt.replace(/[$,]/g, '');

/** Spreadsheet header becomes a tuple type with column names used as tags */
type ExampleRow = [
  destination: string,
  amount: Dollars,
  flatPlusRelay: Dollars,
  variableFee: Dollars,
  totalFee: Dollars,
  netAdvance: Dollars,
  contractCommission: Dollars,
];

const examples: ExampleRow[] = [
  ['Default', '$1,500', '$0.01', '$1.50', '$1.5100', '$1,498.4900', '$0.3020'],
  ['Ethereum', '$1,500', '$0.51', '$1.50', '$2.0100', '$1,497.9900', '$0.8020'],
  ['Optimism', '$1,500', '$0.02', '$1.50', '$1.5200', '$1,498.4800', '$0.3120'],
  ['Polygon', '$1,500', '$0.02', '$1.50', '$1.5200', '$1,498.4800', '$0.3120'],
  ['Arbitrum', '$1,500', '$0.02', '$1.50', '$1.5200', '$1,498.4800', '$0.3120'],
  ['Base', '$1,500', '$0.02', '$1.50', '$1.5200', '$1,498.4800', '$0.3120'],
];

const { USDC } = externalConfigContext;
const { make, add } = AmountMath;

const $ = (amt: Dollars) =>
  multiplyBy(make(USDC, 1_000_000n), parseRatio(numeral(amt), USDC));

const destinationOverrides = fromExternalConfig(
  evmConfig.MAINNET.legibleDestinationOverrides,
  externalConfigContext,
  DestinationOverridesShape,
);

/** production feeConfig from vstorage */
const mainFeeConfig: FeeConfig = {
  contractRate: makeRatio(2n, USDC, 10n),
  flat: make(USDC, 10000n),
  variableRate: makeRatio(1n, USDC, 1000n),
};
harden(mainFeeConfig);
const feeConfig = harden({ ...mainFeeConfig, destinationOverrides });
const { calculateSplit, calculateBaseFee } = makeFeeTools(feeConfig);

test('EVM fee config matches product spreadsheet', t => {
  for (const row of examples) {
    t.log(row.map(x => `${x}`).join(' '));
    const [name, amt, flatPlusRelay, vbl, totFee, netAdvance, contractPart] =
      row;

    const { namespace, reference } = cctpChainInfo[name.toLowerCase()] || {};
    const dest: AccountId = namespace
      ? `${namespace}:${reference}:0x1234567890123456789012345678901234567890`
      : 'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men';
    const base = calculateBaseFee($(amt), dest);
    const { ContractFee, RelayFee, Principal } = calculateSplit($(amt), dest);

    t.deepEqual(add(feeConfig.flat, RelayFee), $(flatPlusRelay), name);
    t.deepEqual(base, add(feeConfig.flat, $(vbl)), name);
    t.deepEqual(add(base, RelayFee), $(totFee), name);
    t.deepEqual(Principal, $(netAdvance), name);
    t.deepEqual(add(ContractFee, RelayFee), $(contractPart), name);
  }
});
