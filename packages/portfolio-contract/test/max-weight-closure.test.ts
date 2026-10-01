/** @file Tests for generic maximum-weight closure. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { fc, testProp } from '@fast-check/ava';
import { maxWeightClosure } from '../src/max-weight-closure.ts';

const maxClosure = (
  weights: Readonly<Record<string, bigint>>,
  dependencies: Readonly<Record<string, string[]>> = {},
) =>
  maxWeightClosure(
    Object.keys(weights),
    node => weights[node]!,
    node => dependencies[node] ?? [],
  );

test('maximum-weight closure may be empty', t => {
  t.is(maxClosure({ loss: -1n }), 0n);
});

test('maximum-weight closure includes required losses', t => {
  t.is(maxClosure({ gain: 10n, cost: -4n }, { gain: ['cost'] }), 6n);
  t.is(maxClosure({ gain: 3n, cost: -4n }, { gain: ['cost'] }), 0n);
});

test('maximum-weight closure recognizes shared costs', t => {
  t.is(
    maxClosure(
      { gain1: 5n, gain2: 5n, sharedCost: -6n },
      { gain1: ['sharedCost'], gain2: ['sharedCost'] },
    ),
    4n,
  );
});

test('maximum-weight closure treats cycles as one choice', t => {
  t.is(
    maxClosure({ gain: 5n, cost: -2n }, { gain: ['cost'], cost: ['gain'] }),
    3n,
  );
});

const bruteForceMaxClosure = (
  weights: bigint[],
  dependencies: Array<Set<number>>,
) => {
  let maximum = 0n;
  for (let selected = 0; selected < 2 ** weights.length; selected += 1) {
    const includes = (node: number) => (selected & (1 << node)) !== 0;
    const closed = dependencies.every(
      (required, node) => !includes(node) || [...required].every(includes),
    );
    if (!closed) continue;
    const weight = weights.reduce(
      (total, nodeWeight, node) => total + (includes(node) ? nodeWeight : 0n),
      0n,
    );
    if (weight > maximum) maximum = weight;
  }
  return maximum;
};

const arbGraph = fc
  .array(
    fc.record({
      weight: fc.integer({ min: -10, max: 10 }),
      dependencies: fc.array(fc.nat(), { maxLength: 8 }),
    }),
    { maxLength: 8 },
  )
  .map(nodes => ({
    weights: nodes.map(({ weight }) => BigInt(weight)),
    dependencies: nodes.map(
      ({ dependencies }) =>
        new Set(dependencies.map(node => node % nodes.length)),
    ),
  }));

testProp(
  'maximum-weight closure agrees with exhaustive search',
  [arbGraph],
  (t, { weights, dependencies }) => {
    const nodes = [...weights.keys()];
    t.is(
      maxWeightClosure(
        nodes,
        node => weights[node]!,
        node => dependencies[node]!,
      ),
      bruteForceMaxClosure(weights, dependencies),
    );
  },
  { numRuns: 1_000 },
);
