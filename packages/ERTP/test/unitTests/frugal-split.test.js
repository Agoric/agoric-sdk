import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { M } from '@endo/patterns';
import { AmountMath as am } from '../../src/index.js';
import { mockNatBrand } from './mathHelpers/mockBrand.js';

// Each of the test results marked "conservative" below are allowed to get
// more accurate over time. They may not become less accurate.
// Once a test result is marked "accurate", it must not change.

test('frugalSplit', t => {
  const $ = value =>
    harden({
      brand: mockNatBrand,
      value,
    });

  // ground patterns, i.e., which patterns which are concrete amounts
  t.deepEqual(am.frugalSplit($(3n), $(2n)), {
    // accurate
    matched: $(2n),
    change: $(1n),
  });

  // outer amount patterns
  t.deepEqual(am.frugalSplit($(3n), M.any()), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(am.frugalSplit($(3n), M.gte($(2n))), {
    // conservative
    matched: $(3n),
    change: $(0n),
  });
  t.deepEqual(am.frugalSplit($(3n), M.lte($(2n))), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(
    am.frugalSplit($(3n), M.and($(2n))),
    // conservative
    undefined,
  );
  t.deepEqual(am.frugalSplit($(3n), M.and($(0n))), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(am.frugalSplit($(3n), M.and($(3n))), {
    // accurate
    matched: $(3n),
    change: $(0n),
  });

  // inner amount patterns, i.e., amount-value patterns
  t.deepEqual(am.frugalSplit($(3n), $(M.any())), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(am.frugalSplit($(3n), $(M.gte(2n))), {
    // conservative
    matched: $(3n),
    change: $(0n),
  });
  t.deepEqual(am.frugalSplit($(3n), $(M.lte(2n))), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(
    am.frugalSplit($(3n), $(M.and(2n))),
    // conservative
    undefined,
  );
  t.deepEqual(am.frugalSplit($(3n), $(M.and(0n))), {
    // accurate
    matched: $(0n),
    change: $(3n),
  });
  t.deepEqual(am.frugalSplit($(3n), $(M.and(3n))), {
    // accurate
    matched: $(3n),
    change: $(0n),
  });
});
