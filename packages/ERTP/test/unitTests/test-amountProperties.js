import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeCopyBag } from '@agoric/store';
import { fc } from '@fast-check/ava';

import { AmountMath as m, AssetKind } from '../../src/index.js';
import { mockCopyBagBrand as mockBrand } from './mathHelpers/mockBrand.js';

// Perhaps makeCopyBag should coalesce duplicate labels, but for now, it does
// not.
const distinctLabels = pairs =>
  new Set(pairs.map(([label, _qty]) => label)).size === pairs.length;
const positiveCounts = pairs =>
  pairs.filter(([_l, qty]) => qty > 0n).length === pairs.length;
const arbBagContents = fc
  .nat(7)
  .chain(size =>
    fc.array(
      fc.tuple(fc.string(), fc.bigUint({ max: 1_000_000_000_000_000n })),
      { minLength: size, maxLength: size },
    ),
  )
  .filter(pairs => distinctLabels(pairs) && positiveCounts(pairs));

const arbAmount = arbBagContents.map(contents =>
  m.make(mockBrand, harden(makeCopyBag(contents))),
);

// Note: we write P => Q as !P || Q since JS has no logical => operator
const implies = (p, q) => !p || q;

test('isEqual is a (total) equivalence relation', async t => {
  await fc.assert(
    fc.property(
      fc.record({ x: arbAmount, y: arbAmount, z: arbAmount }),
      ({ x, y, z }) => {
        return (
          // Total
          t.true([true, false].includes(m.isEqual(x, y))) &&
          // Reflexive
          t.true(m.isEqual(x, x)) &&
          // Symmetric
          t.true(implies(m.isEqual(x, y), m.isEqual(y, x))) &&
          // Transitive
          t.true(implies(m.isEqual(x, y) && m.isEqual(y, z), m.isEqual(x, z)))
        );
      },
    ),
  );
});

test('isGTE is a partial order with empty as minimum', async t => {
  const empty = m.makeEmpty(mockBrand, AssetKind.COPY_BAG);
  await fc.assert(
    fc.property(fc.record({ x: arbAmount, y: arbAmount }), ({ x, y }) => {
      return (
        t.true(m.isGTE(x, empty)) &&
        // Total
        t.true([true, false].includes(m.isGTE(x, y))) &&
        // Reflexive
        t.true(m.isGTE(x, x)) &&
        // Antisymmetric
        t.true(implies(m.isGTE(x, y) && m.isGTE(y, x), m.isEqual(x, y)))
      );
    }),
  );
});

test('add: closed, commutative, associative, monotonic, with empty identity', async t => {
  const empty = m.makeEmpty(mockBrand, AssetKind.COPY_BAG);
  await fc.assert(
    fc.property(
      fc.record({ x: arbAmount, y: arbAmount, z: arbAmount }),
      ({ x, y, z }) => {
        return (
          // note: + for SET is not total.
          t.truthy(m.coerce(mockBrand, m.add(x, y))) &&
          // Identity (right)
          t.true(m.isEqual(m.add(x, empty), x)) &&
          // Identity (left)
          t.true(m.isEqual(m.add(empty, x), x)) &&
          // Commutative
          t.true(m.isEqual(m.add(x, y), m.add(y, x))) &&
          // Associative

          t.true(m.isEqual(m.add(m.add(x, y), z), m.add(x, m.add(y, z)))) &&
          // Monotonic (left)
          t.true(m.isGTE(m.add(x, y), x)) &&
          // Monotonic (right)
          t.true(m.isGTE(m.add(x, y), y))
        );
      },
    ),
  );
});

test('subtract: (x + y) - y = x; (y - x) + x = y if y >= x', async t => {
  await fc.assert(
    fc.property(fc.record({ x: arbAmount, y: arbAmount }), ({ x, y }) => {
      return (
        t.true(m.isEqual(m.subtract(m.add(x, y), y), x)) &&
        t.true(m.isGTE(y, x) ? m.isEqual(m.add(m.subtract(y, x), x), y) : true)
      );
    }),
  );
});

test('minmax', t => {
  fc.assert(
    fc.property(fc.record({ x: arbAmount, y: arbAmount }), ({ x, y }) => {
      return (
        (!m.isGTE(x, y) ||
          (t.deepEqual(m.min(x, y), y, 'min') &&
            t.deepEqual(m.max(x, y), x, 'max'))) &&
        (m.isGTE(x, y) ||
          m.isGTE(y, x) ||
          (!!t.throws(() => m.min(x, y), {
            message: /\{"brand":.*?\} and \{"brand":.*?\} are incomparable/,
          }) &&
            !!t.throws(() => m.max(x, y), {
              message: /\{"brand":.*?\} and \{"brand":.*?\} are incomparable/,
            })))
      );
    }),
  );
});
