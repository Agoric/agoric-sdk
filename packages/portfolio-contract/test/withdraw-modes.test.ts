/** @file withdrawal: pro-rata vs. rebalance mode */
// prepare-test-env has to go 1st; use a blank line to separate it
import { AmountMath } from '@agoric/ertp';
import { makeRatio, multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Nat } from '@endo/nat';
import { Far } from '@endo/pass-style';
import { M, mustMatch, objectMap } from '@endo/patterns';
import { withdrawTargetsFromAllocation } from '../../../services/ymax-planner/src/plan-deposit.ts';
import {
  makeNatAmountShape,
  TargetAllocationShapeExt,
} from '../src/type-guards.ts';

/** an example negotiated with product */
const dataPasted = `
pro-rata					
		Before		Withdraw	After
				pro-rata	
	Alloc (target/requested)	Balance	Alloc (current)		
Aave	60%	$613.00	58.66%	$205.31	$407.69
Beefy	30%	$315.00	30.14%	$105.50	$209.50
Compound	10%	$117.00	11.20%	$39.19	$77.81
	100.00%	$1,045.00	100.00%	$350.00	$695.00
					$695.00
					
+rebalance					
		Before		Withdraw	After
				+rebalance	
	Alloc (requested)	Balance	Alloc (current)		
Aave	60%	$613.00	58.66%	$196.00	$417.00
Beefy	30%	$315.00	30.14%	$106.50	$208.50
Compound	10%	$117.00	11.20%	$47.50	$69.50
	100.00%	$1,045.00	100.00%	$350.00	$695.00
					$695.00
`;

const fmtRow = (row: string[]) => row.join('\t');

type Dollars = `$${string}`;
const numeral = (amt: Dollars) => amt.replace(/[$,]/g, '');

const externalConfigContext = {
  USDC: Far('USDC Brand') as Brand<'nat'>,
} as const;

const { USDC } = externalConfigContext;
const { make, add } = AmountMath;

const $ = (amt: Dollars) =>
  multiplyBy(make(USDC, 1_000_000n), parseRatio(numeral(amt), USDC));

const $Shape = makeNatAmountShape(USDC);

const pct = (v: `${number}%`) =>
  makeRatio(Nat(BigInt(v.replace(/%$/, ''))), USDC, 100n);

const modes = (() => {
  const lines = dataPasted.trim().split('\n');
  const rows = lines.map(line => line.split('\t'));
  const half = rows.length / 2;
  const [prorata, rebalance] = [rows.slice(0, half), rows.slice(half + 1)];
  return harden({ prorata, rebalance });
})();

const byPos = (section: string[][], col: number, lo = 4, qty = 3) => {
  const rec: Record<string, string> = {};
  for (const row of section.slice(lo, lo + qty)) {
    const [name] = row;
    const val = row[col];
    rec[name] = val;
  }
  return harden(rec);
};

const parseTargetAllocation = (section: string[][]) =>
  objectMap(byPos(section, 1), val => Nat(BigInt(val.replace(/%$/, ''))));

test('parse target allocation from sheet', t => {
  const targetAllocation = parseTargetAllocation(modes.prorata);
  t.log('target', targetAllocation);
  t.notThrows(() => mustMatch(targetAllocation, TargetAllocationShapeExt));
});

test('parse before, withdraw, after columns', t => {
  const [before, withdraw, after] = [2, 4, 5].map(col =>
    objectMap(byPos(modes.prorata, col), $),
  );
  t.log({ before, withdraw, after });

  for (const col of [before, withdraw, after]) {
    t.notThrows(() => mustMatch(col, M.recordOf(M.string(), $Shape)));
  }
});

test('test rebalance withdraw', t => {
  const { rebalance } = modes;
  const [_h0, [_A, _B, _C, _D, hd]] = rebalance;
  t.is(hd, 'Withdraw');
  const [E] = [4];
  const amount = $(rebalance[4 + 3][E] as Dollars);
  t.log({ amount });
  const [current, expected] = [2, 5].map(c =>
    objectMap(byPos(rebalance, c), $),
  );
  t.log({ current });
  const allocation = parseTargetAllocation(modes.prorata);
  t.log('allocation', allocation);
  const actual = withdrawTargetsFromAllocation(amount, current, allocation);
  t.log('actual after', actual);
  t.deepEqual(actual, { '<Cash>': amount, ...expected });
});

test.todo('pro-rata');
