import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { M } from '@endo/patterns';

import { AmountMath as m } from '../../../src/index.js';
import { mockSetBrand as mockBrand } from './mockBrand.js';

const mock = value => harden({ brand: mockBrand, value });

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

test('set minus setBound', t => {
  t.deepEqual(
    m.subtract(mock(['a', 'b']), mock(M.has(M.any(), 1n))),
    mock(['b']),
  );
  t.deepEqual(m.subtract(mock(['a', 'b']), mock(M.has('a', 1n))), mock(['b']));
  t.deepEqual(
    m.subtract(mock(['a', 'b']), mock(M.has(M.any(), 1n))),
    mock(['b']),
  );
  t.deepEqual(m.subtract(mock(['a', 'b']), mock(M.has(M.any(), 2n))), mock([]));
  t.deepEqual(m.subtract(mock(['a', 'b']), mock(M.has(M.any()))), mock(['b']));

  t.throws(() => m.subtract(mock(['a', 'b']), mock(M.has(M.any(), 3n))), {
    message: 'Has only "[2n]" matches, but needs "[3n]"',
  });

  t.throws(() => m.subtract(mock(['a', 'b']), mock(M.has('c', 1n))), {
    message: 'Has only "[0n]" matches, but needs "[1n]"',
  });

  t.throws(() => m.subtract(mock(['a', 'b']), mock(M.has('c'))), {
    message: 'Has only "[0n]" matches, but needs "[1n]"',
  });
});

test('set isGTE setBound', t => {
  t.true(m.isGTE(mock(['a', 'b']), mock(M.has(M.any(), 1n))));
  t.true(m.isGTE(mock(['a', 'b']), mock(M.has('a', 1n))));
  t.true(m.isGTE(mock(['a', 'b']), mock(M.has(M.any(), 1n))));
  t.true(m.isGTE(mock(['a', 'b']), mock(M.has(M.any(), 2n))));
  t.false(m.isGTE(mock(['a', 'b']), mock(M.has(M.any(), 3n))));
  t.false(m.isGTE(mock(['a', 'b']), mock(M.has('c', 1n))));

  t.true(m.isGTE(mock(['a', 'b']), mock(M.has(M.any()))));
});
