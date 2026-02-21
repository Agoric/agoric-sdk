import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';

import { encodeType } from '../../src/utils/viem-utils/hashTypedData.js';
import {
  extractWitnessFieldFromTypes,
  makeWitnessTypeStringExtractor,
} from '../../src/utils/permit2/signatureTransferHelpers.js';
import {
  permitBatchWitnessTransferFromTypes,
  permitWitnessTransferFromTypes,
} from '../../src/utils/permit2/signatureTransfer.js';

const witnessField = { name: 'witness', type: 'Foo' } as const;
const witnessTypes = {
  Foo: [
    { name: 'foo', type: 'uint256' },
    { name: 'bar', type: 'address' },
  ],
} as const;

const batchWitnessField = { name: 'witness', type: 'Bar' } as const;
const batchWitnessTypes = {
  Bar: [{ name: 'count', type: 'uint256' }],
} as const;

const customWitnessField = { name: 'payload', type: 'Baz' } as const;
const customWitnessTypes = {
  Baz: [{ name: 'id', type: 'bytes32' }],
} as const;

const laterWitnessField = { name: 'witness', type: 'Zoo' } as const;
const laterWitnessTypes = {
  Zoo: [{ name: 'value', type: 'uint256' }],
} as const;

const getWitnessTypeString = makeWitnessTypeStringExtractor({ encodeType });

test('makeWitnessTypeStringExtractor (single)', t => {
  const types = permitWitnessTransferFromTypes({
    witnessField,
    witnessTypes,
  });

  t.is(
    getWitnessTypeString(types),
    'Foo witness)Foo(uint256 foo,address bar)TokenPermissions(address token,uint256 amount)',
  );
});

test('makeWitnessTypeStringExtractor (batch)', t => {
  const types = permitBatchWitnessTransferFromTypes({
    witnessField: batchWitnessField,
    witnessTypes: batchWitnessTypes,
  });

  t.is(
    getWitnessTypeString(types),
    'Bar witness)Bar(uint256 count)TokenPermissions(address token,uint256 amount)',
  );
});

test('makeWitnessTypeStringExtractor (custom field name)', t => {
  const types = permitWitnessTransferFromTypes({
    witnessField: customWitnessField,
    witnessTypes: customWitnessTypes,
  });

  t.is(
    getWitnessTypeString(types),
    'Baz payload)Baz(bytes32 id)TokenPermissions(address token,uint256 amount)',
  );
});

test('makeWitnessTypeStringExtractor (witness type sorts after TokenPermissions)', t => {
  const types = permitWitnessTransferFromTypes({
    witnessField: laterWitnessField,
    witnessTypes: laterWitnessTypes,
  });

  t.is(
    getWitnessTypeString(types),
    'Zoo witness)TokenPermissions(address token,uint256 amount)Zoo(uint256 value)',
  );
});

test('extractWitnessFieldFromTypes returns the witness field', t => {
  const types = permitWitnessTransferFromTypes({
    witnessField,
    witnessTypes,
  });
  const batchTypes = permitBatchWitnessTransferFromTypes({
    witnessField: batchWitnessField,
    witnessTypes: batchWitnessTypes,
  });
  const customTypes = permitWitnessTransferFromTypes({
    witnessField: customWitnessField,
    witnessTypes: customWitnessTypes,
  });

  t.deepEqual(extractWitnessFieldFromTypes(types), witnessField);
  t.deepEqual(extractWitnessFieldFromTypes(batchTypes), batchWitnessField);
  t.deepEqual(extractWitnessFieldFromTypes(customTypes), customWitnessField);
});

test('extractWitnessFieldFromTypes throws on invalid shapes', t => {
  // Missing witness field.
  // @ts-expect-error deliberate mismatch
  const truncatedTypes = permitWitnessTransferFromTypes(undefined);
  t.throws(() => extractWitnessFieldFromTypes(truncatedTypes), {
    message: 'PermitWitnessTransferFrom must have 5 fields',
  });

  const types = permitWitnessTransferFromTypes({
    witnessField,
    witnessTypes,
  });
  const badFields = [...types.PermitWitnessTransferFrom];
  // @ts-expect-error deliberate mismatch
  badFields[0] = { name: 'wrong', type: 'address' };
  const badTypes = {
    ...types,
    PermitWitnessTransferFrom: badFields,
  };

  // @ts-expect-error deliberate mismatch
  t.throws(() => extractWitnessFieldFromTypes(badTypes), {
    message:
      'PermitWitnessTransferFrom field at index 0 must be `TokenPermissions permitted`',
  });
});
