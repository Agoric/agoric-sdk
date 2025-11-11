import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { M } from '@endo/patterns';

import { AmountMath as m } from '../../../src/index.js';
import { mockSetBrand as mockBrand } from './mockBrand.js';

const mock = value => harden({ brand: mockBrand, value });

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

test('set minus setBound', t => {
  const specimen = mock(['a', 'b', 'c']);
  t.deepEqual(
    m.subtract(specimen, mock(M.containerHas(M.any(), 1n))),
    mock(['b', 'c']),
  );
  t.deepEqual(
    m.subtract(specimen, mock(M.containerHas('a', 1n))),
    mock(['b', 'c']),
  );
  t.deepEqual(
    m.subtract(specimen, mock(M.containerHas(M.any(), 1n))),
    mock(['b', 'c']),
  );
  t.deepEqual(
    m.subtract(specimen, mock(M.containerHas(M.any(), 3n))),
    mock([]),
  );
  t.deepEqual(
    m.subtract(specimen, mock(M.containerHas(M.any()))),
    mock(['b', 'c']),
  );

  t.throws(() => m.subtract(specimen, mock(M.containerHas(M.any(), 4n))), {
    message: 'Has only "[3n]" matches, but needs "[4n]"',
  });

  t.throws(() => m.subtract(specimen, mock(M.containerHas('d', 1n))), {
    message: 'Has only "[0n]" matches, but needs "[1n]"',
  });

  t.throws(() => m.subtract(specimen, mock(M.containerHas('d'))), {
    message: 'Has only "[0n]" matches, but needs "[1n]"',
  });
});

test('set isGTE setBound', t => {
  const specimen = mock(['a', 'b', 'c']);
  t.true(m.isGTE(specimen, mock(M.containerHas(M.any(), 1n))));
  t.true(m.isGTE(specimen, mock(M.containerHas('a', 1n))));
  t.true(m.isGTE(specimen, mock(M.containerHas(M.any(), 1n))));
  t.true(m.isGTE(specimen, mock(M.containerHas(M.any(), 3n))));
  t.false(m.isGTE(specimen, mock(M.containerHas(M.any(), 4n))));
  t.false(m.isGTE(specimen, mock(M.containerHas('d', 1n))));

  t.true(m.isGTE(specimen, mock(M.containerHas(M.any()))));
});
