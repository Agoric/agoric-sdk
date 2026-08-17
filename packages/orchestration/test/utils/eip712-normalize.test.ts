import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';

import { normalizeAndValidateEIP712Data } from '../../src/utils/viem-utils/eip712-normalize.js';

test('no-op round trip for a fully-conforming message', t => {
  const types = {
    Mail: [
      { name: 'from', type: 'string' },
      { name: 'contents', type: 'string' },
    ],
  };
  const message = { from: 'alice', contents: 'hi' };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Mail',
  });

  t.deepEqual(result, { message, types });
});

test('drops an extra top-level field by default', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message = { contents: 'hi', adminOverride: true };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Mail',
  });

  t.deepEqual(result.message, { contents: 'hi' });
});

test('throws on an extra top-level field with onExtraField: "throw"', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message = { contents: 'hi', adminOverride: true };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'throw' },
      ),
    { message: /adminOverride/ },
  );
});

test('throw mode lists every extra field when there is more than one', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message = { contents: 'hi', extra1: true, extra2: 42 };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'throw' },
      ),
    { message: /"extra1", "extra2"/ },
  );
});

test('treats an inherited (prototype-chain) property as present, matching viem', t => {
  const types = {
    Mail: [
      { name: 'contents', type: 'string' },
      { name: 'note', type: 'string', optional: true },
    ],
  };
  // `contents` and `note` are only present via the prototype chain, not as
  // own properties. viem's own hashStruct/validateTypedData read field
  // values via plain property access (`data[field.name]`), which resolves
  // the prototype chain the same way, so this must be treated as "present".
  const message = Object.create({ contents: 'hi', note: 'fyi' });

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Mail',
  });

  t.deepEqual(result.message, { contents: 'hi', note: 'fyi' });
  t.deepEqual(result.types.Mail, [
    { name: 'contents', type: 'string' },
    { name: 'note', type: 'string' },
  ]);
});

test('drops (or throws on) an extra field on a nested struct', t => {
  const types = {
    Mail: [{ name: 'from', type: 'Person' }],
    Person: [{ name: 'name', type: 'string' }],
  };
  const message = {
    from: { name: 'alice', internalUserId: 'not-signed' },
  };

  const dropped = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Mail',
  });
  t.deepEqual(dropped.message, { from: { name: 'alice' } });

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'throw' },
      ),
    { message: /internalUserId/ },
  );
});

test('truncates a fixed-length array beyond its declared length', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[2]' }],
  };
  const message = { members: ['a', 'b', 'c'] };

  const dropped = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Group',
  });
  t.deepEqual(dropped.message, { members: ['a', 'b'] });

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Group' },
        { onExtraField: 'throw' },
      ),
    { message: /string\[2\]/ },
  );
});

test('never truncates a dynamic-length array', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[]' }],
  };
  const message = { members: ['a', 'b', 'c', 'd', 'e'] };

  const result = normalizeAndValidateEIP712Data(
    { message, types, primaryType: 'Group' },
    { onExtraField: 'throw' },
  );
  t.deepEqual(result.message, message);
});

test('optional field observed on only one of several instances of a repeated type is rejected on the other instance', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'Widget[]' }],
    Widget: [
      { name: 'id', type: 'uint256' },
      { name: 'label', type: 'string', optional: true },
    ],
  };
  const message = {
    widgets: [
      { id: 1n, label: 'first' },
      { id: 2n }, // no label
    ],
  };

  // `label` is observed on the first widget, so it becomes required for
  // *every* `Widget` instance (EIP-712 has one field list per type name --
  // true per-instance optionality across repeated usages isn't
  // representable). The second instance, which never set it, is therefore
  // now missing a required field, and gets rejected.
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types,
        primaryType: 'Batch',
      }),
    { message: /label/ },
  );
});

test('optional field observed only on a later instance, after an earlier instance omitted it, is also rejected (order-symmetric)', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'Widget[]' }],
    Widget: [
      { name: 'id', type: 'uint256' },
      { name: 'label', type: 'string', optional: true },
    ],
  };
  // Same conflict as the test above, but in the opposite order: the first
  // instance is the one missing `label`, and the second is the one that
  // sets it. This exercises the other transition (an already
  // "confirmed-absent" field turning up present later), not just "already
  // required, then found missing".
  const message = {
    widgets: [
      { id: 1n }, // no label
      { id: 2n, label: 'second' },
    ],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types,
        primaryType: 'Batch',
      }),
    { message: /label/ },
  );
});

test('drops an optional field never observed anywhere in the message', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'Widget[]' }],
    Widget: [
      { name: 'id', type: 'uint256' },
      { name: 'label', type: 'string', optional: true },
    ],
  };
  const message = { widgets: [{ id: 1n }, { id: 2n }] };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Batch',
  });

  t.deepEqual(result.types.Widget, [{ name: 'id', type: 'uint256' }]);
});

test('cascades unreferenced-type pruning through a removed optional field', t => {
  const types = {
    Mail: [
      { name: 'contents', type: 'string' },
      { name: 'attachment', type: 'Attachment', optional: true },
    ],
    Attachment: [{ name: 'blob', type: 'Blob' }],
    Blob: [{ name: 'hash', type: 'string' }],
  };

  const withoutAttachment = normalizeAndValidateEIP712Data({
    message: { contents: 'hi' },
    types,
    primaryType: 'Mail',
  });
  t.deepEqual(withoutAttachment.types.Mail, [
    { name: 'contents', type: 'string' },
  ]);
  t.falsy(withoutAttachment.types.Attachment);
  t.falsy(withoutAttachment.types.Blob);

  const withAttachment = normalizeAndValidateEIP712Data({
    message: { contents: 'hi', attachment: { blob: { hash: 'abc' } } },
    types,
    primaryType: 'Mail',
  });
  t.deepEqual(withAttachment.types.Mail, [
    { name: 'contents', type: 'string' },
    { name: 'attachment', type: 'Attachment' },
  ]);
  t.deepEqual(withAttachment.types.Attachment, [
    { name: 'blob', type: 'Blob' },
  ]);
  t.deepEqual(withAttachment.types.Blob, [{ name: 'hash', type: 'string' }]);
});

test('always preserves EIP712Domain even though it is never reached by the primaryType walk', t => {
  const types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
    ],
    Mail: [{ name: 'contents', type: 'string' }],
  };

  const result = normalizeAndValidateEIP712Data({
    message: { contents: 'hi' },
    types,
    primaryType: 'Mail',
  });

  t.deepEqual(result.types.EIP712Domain, types.EIP712Domain);
});

test('"keep" mode resolves optional types but leaves the message untouched', t => {
  const types = {
    Mail: [
      { name: 'contents', type: 'string' },
      { name: 'attachment', type: 'Attachment', optional: true },
    ],
    Attachment: [{ name: 'blob', type: 'string' }],
  };
  const message = {
    contents: 'hi',
    adminOverride: true, // would be dropped/rejected in 'drop'/'throw' modes
  };

  const result = normalizeAndValidateEIP712Data(
    { message, types, primaryType: 'Mail' },
    { onExtraField: 'keep' },
  );

  // message is returned exactly as given, extras and all
  t.is(result.message, message);
  // types are still resolved: unused optional `attachment` (and the
  // now-unreferenced `Attachment` type) are dropped
  t.deepEqual(result.types.Mail, [{ name: 'contents', type: 'string' }]);
  t.falsy(result.types.Attachment);
});

test('"keep" mode never truncates a fixed-length array', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[2]' }],
  };
  const message = { members: ['a', 'b', 'c'] };

  const result = normalizeAndValidateEIP712Data(
    { message, types, primaryType: 'Group' },
    { onExtraField: 'keep' },
  );

  t.is(result.message, message);
  t.deepEqual(result.message.members, ['a', 'b', 'c']);
});

test('an empty array still registers its struct element type in the resolved types', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'Widget[]' }],
    Widget: [{ name: 'id', type: 'uint256' }],
  };
  const message = { widgets: [] };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Batch',
  });

  // No element is ever visited (there are none), so nothing but an explicit
  // "ping" of the element type would otherwise get `Widget` into `types`.
  t.deepEqual(result.types.Widget, [{ name: 'id', type: 'uint256' }]);
});

test('a fixed-length-0 array still registers its struct element type in the resolved types', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'Widget[0]' }],
    Widget: [{ name: 'id', type: 'uint256' }],
  };
  // 3 actual elements against a declared fixed length of 0: every one of
  // them is out of scope (effective length is min(3, 0) = 0), so none is
  // visited -- `Widget` must still end up in `types` via the length-0 ping,
  // not by visiting any instance.
  const message = { widgets: [{ id: 1n }, { id: 2n }, { id: 3n }] };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Batch',
  });

  t.deepEqual(result.types.Widget, [{ name: 'id', type: 'uint256' }]);
});

test('throw mode rejects a stray non-indexed property on an array-typed field', t => {
  const types = {
    Batch: [{ name: 'widgets', type: 'string[]' }],
  };
  const widgets = ['a', 'b'];
  // Array-like, but with an extra own enumerable property beyond its
  // indices -- not part of the array field's declared shape.
  Object.assign(widgets, { sneaky: true });
  const message = { widgets };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Batch' },
        { onExtraField: 'throw' },
      ),
    { message: /sneaky/ },
  );
});

test('a struct type can be satisfied by an array value that has the declared properties', t => {
  const types = {
    Weird: [
      { name: '0', type: 'string' },
      { name: '1', type: 'string' },
      { name: 'length', type: 'uint256' },
    ],
  };
  // A real array happens to have '0', '1', and (non-enumerable, but still
  // found via `in`, which doesn't care about enumerability) 'length' --
  // enough to satisfy this (unusual) struct declaration, even though it's
  // not a plain object and `Array.isArray` would be true for it.
  const message = ['a', 'b'] as unknown as Record<string, unknown>;

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Weird',
  });

  t.deepEqual(result.message, { '0': 'a', '1': 'b', length: 2 });
});

test('an array-like object (not a real Array) can satisfy an array type', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[]' }],
  };
  // Plain object with numeric-index properties and an explicit `length`,
  // `Array.isArray` is false for it, but it's still walkable as an array.
  const message = { members: { 0: 'a', 1: 'b', length: 2 } };

  const result = normalizeAndValidateEIP712Data({
    message,
    types,
    primaryType: 'Group',
  });

  t.deepEqual(result.message.members, ['a', 'b']);
});

// --- validation (folded in from what used to be a separate, incomplete
// `validateTypedData` step -- see the module doc comment) ---

test('rejects a missing required field', t => {
  const types = {
    Mail: [
      { name: 'from', type: 'string' },
      { name: 'contents', type: 'string' },
    ],
  };
  const message = { from: 'alice' };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({ message, types, primaryType: 'Mail' }),
    {
      message: /contents/,
    },
  );
});

test('rejects a fixed-length array with fewer than its declared number of elements', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[2]' }],
  };
  const message = { members: ['a'] };

  // Unlike too *many* elements (silently truncated in 'drop' mode, rejected
  // in 'throw' mode), too *few* isn't something either mode can paper over:
  // the data is genuinely incomplete, not merely carrying something extra.
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({ message, types, primaryType: 'Group' }),
    {
      message: /string\[2\]/,
    },
  );
});

test('rejects an unknown primary type instead of silently passing the message through', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { contents: 'hi' },
        types,
        primaryType: 'Bogus',
      }),
    { message: /Bogus/ },
  );
});

test('validates integer range for a direct field, matching viem', t => {
  const types = {
    Person: [{ name: 'favoriteNumber', type: 'uint8' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumber: -1 },
        types,
        primaryType: 'Person',
      }),
    { message: /favoriteNumber|uint8/ },
  );
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumber: 256 },
        types,
        primaryType: 'Person',
      }),
    { message: /uint8/ },
  );
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumber: -129 },
        types: { Person: [{ name: 'favoriteNumber', type: 'int8' }] },
        primaryType: 'Person',
      }),
    { message: /int8/ },
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: { favoriteNumber: 255 },
      types,
      primaryType: 'Person',
    }),
  );
});

test('validates integer range for elements of an array -- unlike viem, which skips array-typed fields entirely', t => {
  const types = {
    Group: [{ name: 'favoriteNumbers', type: 'uint8[]' }],
  };

  // A real, previously-undetected gap: viem's own `validateTypedData` only
  // walks fields declared directly on a struct, so an out-of-range element
  // nested inside an array sailed through unvalidated.
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumbers: [1, 2, 300] },
        types,
        primaryType: 'Group',
      }),
    { message: /uint8/ },
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: { favoriteNumbers: [1, 2, 255] },
      types,
      primaryType: 'Group',
    }),
  );
});

test('validates address shape for elements of an array of structs', t => {
  const types = {
    Batch: [{ name: 'people', type: 'Person[]' }],
    Person: [{ name: 'wallet', type: 'address' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: {
          people: [
            { wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
            { wallet: '0x000000000000000000000000000000000000z' }, // too short, non-hex tail
          ],
        },
        types,
        primaryType: 'Batch',
      }),
    { message: /address/ },
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: {
        people: [
          { wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
          { wallet: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        ],
      },
      types,
      primaryType: 'Batch',
    }),
  );
});

test('address validation checks shape only, not EIP-55 checksum', t => {
  const types = {
    Person: [{ name: 'wallet', type: 'address' }],
  };

  // All-lowercase (or any casing) is accepted: this module intentionally
  // doesn't validate checksums (see the module doc comment), only that the
  // value is a well-formed 20-byte hex string.
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: { wallet: '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826' },
      types,
      primaryType: 'Person',
    }),
  );
});

test('validates fixed-size bytes length, matching viem', t => {
  const types = {
    Person: [{ name: 'hash', type: 'bytes32' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { hash: '0x0000000000000000000000000000000000000000' },
        types,
        primaryType: 'Person',
      }),
    { message: /bytes32/ },
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: {
        hash: `0x${'00'.repeat(32)}`, // exactly 32 bytes
      },
      types,
      primaryType: 'Person',
    }),
  );
});

// --- strict JS-type matching: unlike viem's `validateTypedData`, which
// only range/shape-checks a value when it already happens to have a
// plausible JS type (and otherwise silently defers to real hashing, which
// itself sometimes *coerces* rather than rejects), these values are
// rejected outright so that "validation succeeded" implies "hashing this
// will succeed, and will hash exactly this value".

test('rejects a non-string value for an "address" field', t => {
  const types = {
    Person: [{ name: 'wallet', type: 'address' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { wallet: 12345 },
        types,
        primaryType: 'Person',
      }),
    { message: /address/ },
  );
});

test('rejects a non-boolean value for a "bool" field', t => {
  const types = {
    Person: [{ name: 'isActive', type: 'bool' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { isActive: 'true' },
        types,
        primaryType: 'Person',
      }),
    { message: /bool/ },
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: { isActive: true },
      types,
      primaryType: 'Person',
    }),
  );
});

test('rejects a non-string value for a "string" field -- viem itself would silently coerce it', t => {
  const types = {
    Person: [{ name: 'name', type: 'string' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { name: 42 },
        types,
        primaryType: 'Person',
      }),
    { message: /string/ },
  );
});

test('rejects a non-integer number and a non-number/bigint value for an integer field', t => {
  const types = {
    Person: [{ name: 'favoriteNumber', type: 'uint8' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumber: 3.14 },
        types,
        primaryType: 'Person',
      }),
    { message: /uint8/ },
  );
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { favoriteNumber: '5' },
        types,
        primaryType: 'Person',
      }),
    { message: /uint8/ },
  );
});

test('rejects a non-string/non-hex value for a "bytes" field, fixed or dynamic', t => {
  const types = {
    Person: [
      { name: 'hash', type: 'bytes32' },
      { name: 'data', type: 'bytes' },
    ],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { hash: 42, data: '0x' },
        types,
        primaryType: 'Person',
      }),
    { message: /bytes32/ },
  );
  // Not valid hex at all -- previously silently unvalidated, since the old
  // check only ran once the value was confirmed to already look hex-ish.
  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { hash: `0x${'00'.repeat(32)}`, data: 'not-hex' },
        types,
        primaryType: 'Person',
      }),
    { message: /bytes/ },
  );
});

test('a dynamic "bytes" field accepts a Uint8Array, matching what real hashing accepts', t => {
  // Confirmed against real viem: a top-level dynamic `bytes` field is
  // hashed directly via `keccak256`, which accepts a `Uint8Array` and a
  // hex string interchangeably (and hashes them identically) -- unlike
  // `bytes<M>` (fixed), which is encoded through the generic ABI path and
  // does *not* accept a `Uint8Array` in practice (see the next test).
  const types = {
    Person: [{ name: 'data', type: 'bytes' }],
  };

  t.notThrows(() =>
    normalizeAndValidateEIP712Data({
      message: { data: new Uint8Array([1, 2, 3, 4, 5]) },
      types,
      primaryType: 'Person',
    }),
  );
});

test('a fixed "bytes<M>" field rejects a Uint8Array, unlike dynamic "bytes"', t => {
  // Confirmed against real viem: hashing a fixed-size `bytes32` field given
  // a `Uint8Array` throws ("hex_.replace is not a function") rather than
  // succeeding -- so this must reject it too, even though it's otherwise
  // exactly the same JS value as the dynamic-`bytes` case above.
  const types = {
    Person: [{ name: 'hash', type: 'bytes32' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { hash: new Uint8Array(32).fill(7) },
        types,
        primaryType: 'Person',
      }),
    { message: /bytes32/ },
  );
});

test('rejects a field whose declared type is neither a recognized Solidity primitive nor a declared struct', t => {
  const types = {
    Person: [{ name: 'mystery', type: 'Bogus' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { mystery: 'whatever' },
        types,
        primaryType: 'Person',
      }),
    { message: /Bogus/ },
  );
});

test('rejects a primitive value where a struct is declared', t => {
  const types = {
    Mail: [{ name: 'from', type: 'Person' }],
    Person: [{ name: 'name', type: 'string' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { from: 'not-an-object' },
        types,
        primaryType: 'Mail',
      }),
    { message: /Person/ },
  );
});

test('rejects a primitive value where an array is declared', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[]' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { members: 'not-an-array' },
        types,
        primaryType: 'Group',
      }),
    { message: /string\[\]/ },
  );
});

test('rejects an object without a numeric length where an array is declared', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[]' }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message: { members: {} },
        types,
        primaryType: 'Group',
      }),
    { message: /string\[\]/ },
  );
});

// --- error messages elide large values: `message` (and, in 'throw' mode,
// `types` itself) can come from an untrusted source, so a naively embedded
// string/bigint/field-name-list could otherwise make an error message (and
// whatever ends up logging or displaying it) unboundedly large.

const MAX_REASONABLE_MESSAGE_LENGTH = 500;

test('elides a very large string value in error messages', t => {
  const types = {
    Person: [{ name: 'isActive', type: 'bool' }],
  };
  const huge = 'x'.repeat(10_000);

  const error = t.throws(() =>
    normalizeAndValidateEIP712Data({
      message: { isActive: huge },
      types,
      primaryType: 'Person',
    }),
  );

  t.true(
    error.message.length < MAX_REASONABLE_MESSAGE_LENGTH,
    `expected a short error message, got ${error.message.length} chars`,
  );
  t.regex(error.message, /\d+ chars total/);
});

test('elides a very large bigint value in error messages', t => {
  const types = {
    Person: [{ name: 'favoriteNumber', type: 'uint8' }],
  };
  const huge = 10n ** 1000n; // ~1000-digit bigint, way out of uint8 range

  const error = t.throws(() =>
    normalizeAndValidateEIP712Data({
      message: { favoriteNumber: huge },
      types,
      primaryType: 'Person',
    }),
  );

  t.true(
    error.message.length < MAX_REASONABLE_MESSAGE_LENGTH,
    `expected a short error message, got ${error.message.length} chars`,
  );
});

test('elides a very large declared field/type name in error messages', t => {
  const hugeName = 'f'.repeat(10_000);
  const types = {
    Person: [{ name: hugeName, type: 'string' }],
  };

  const error = t.throws(() =>
    normalizeAndValidateEIP712Data({
      message: {},
      types,
      primaryType: 'Person',
    }),
  );

  t.true(
    error.message.length < MAX_REASONABLE_MESSAGE_LENGTH,
    `expected a short error message, got ${error.message.length} chars`,
  );
});

test('elides a long list of extra fields in error messages', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message: Record<string, unknown> = { contents: 'hi' };
  for (let i = 0; i < 1000; i += 1) {
    message[`extra${i}`] = true;
  }

  const error = t.throws(() =>
    normalizeAndValidateEIP712Data(
      { message, types, primaryType: 'Mail' },
      { onExtraField: 'throw' },
    ),
  );

  t.true(
    error.message.length < MAX_REASONABLE_MESSAGE_LENGTH,
    `expected a short error message, got ${error.message.length} chars`,
  );
});

test('elides a large primary type name and a large types list in error messages', t => {
  const types: Record<string, []> = {};
  for (let i = 0; i < 1000; i += 1) {
    types[`Type${i}`] = [];
  }
  const hugePrimaryType = 'P'.repeat(10_000);

  const error = t.throws(() =>
    normalizeAndValidateEIP712Data({
      message: {},
      types,
      primaryType: hugePrimaryType,
    }),
  );

  t.true(
    error.message.length < MAX_REASONABLE_MESSAGE_LENGTH,
    `expected a short error message, got ${error.message.length} chars`,
  );
});

test('"keep" mode still rejects a missing required field', t => {
  const types = {
    Mail: [
      { name: 'contents', type: 'string' },
      { name: 'favoriteNumber', type: 'uint8' },
    ],
  };
  // `favoriteNumber` is missing data, not excess -- 'keep' only skips
  // removing/rejecting *excess* data (extra fields, over-length arrays), it
  // doesn't skip validation of what's actually declared.
  const message = { contents: 'hi' };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'keep' },
      ),
    { message: /favoriteNumber/ },
  );
});

test('"keep" mode still validates primitive values against their declared type', t => {
  const types = {
    Mail: [{ name: 'favoriteNumber', type: 'uint8' }],
  };
  const message = { favoriteNumber: 256 };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'keep' },
      ),
    { message: /uint8/ },
  );
});

test('"keep" mode still rejects a fixed-length array with fewer than its declared number of elements', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[2]' }],
  };
  const message = { members: ['a'] };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data(
        { message, types, primaryType: 'Group' },
        { onExtraField: 'keep' },
      ),
    { message: /string\[2\]/ },
  );
});

test('"keep" mode never rejects extra fields or excess array elements, only missing data', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
    Group: [{ name: 'members', type: 'string[2]' }],
  };

  t.notThrows(() =>
    normalizeAndValidateEIP712Data(
      {
        message: { contents: 'hi', adminOverride: true },
        types,
        primaryType: 'Mail',
      },
      { onExtraField: 'keep' },
    ),
  );
  t.notThrows(() =>
    normalizeAndValidateEIP712Data(
      { message: { members: ['a', 'b', 'c'] }, types, primaryType: 'Group' },
      { onExtraField: 'keep' },
    ),
  );
});

// --- reentrancy: a single pass shares field-state per (type, field name)
// across every instance of that type encountered anywhere in the message,
// including nested/self-referential ones. These tests specifically probe
// what happens when a type is revisited *while still in the middle of*
// checking an earlier, still-open instance of the same type -- i.e. a
// struct containing (directly or via an array) another instance of its own
// type, so the recursive `visit` call is nested inside the outer instance's
// own field loop, not just a later sibling. `items` below is a *required*
// (not optional) dynamic array so it can be empty -- this is what lets
// recursion terminate without itself becoming an unrelated source of
// missing-required-field conflicts (see the dedicated self-referential test
// below for what happens when the recursive field itself is optional).

const ReentrantNodeTypes = {
  Node: [
    { name: 'value', type: 'uint256' },
    { name: 'before', type: 'string', optional: true },
    { name: 'items', type: 'Node[]' },
    { name: 'after', type: 'string', optional: true },
  ],
};

test('reentrancy: consistent optional fields on both sides of a nested instance of the same type cause no conflict', t => {
  const message = {
    value: 1n,
    before: 'outer-before',
    items: [
      { value: 2n, before: 'inner-before', items: [], after: 'inner-after' },
    ],
    after: 'outer-after',
  };

  const result = normalizeAndValidateEIP712Data({
    message,
    types: ReentrantNodeTypes,
    primaryType: 'Node',
  });

  t.deepEqual(
    result.types.Node.map(f => f.name),
    ['value', 'before', 'items', 'after'],
  );
  t.deepEqual(result.message, message);
});

test('reentrancy: a field declared before the nested instance is checked while still inside the nested visit', t => {
  // `before` comes *before* `items` in declaration order, so by the time
  // the outer instance recurses into `items[0]`, `before` is already
  // "optional-seen" (the outer just confirmed it absent) -- the inner
  // instance then sets it, which is the conflict, and it's detected
  // *during* that nested call, before the outer resumes at all.
  const message = {
    value: 1n,
    // `before` absent on the outer instance
    items: [{ value: 2n, before: 'inner-before', items: [] }],
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types: ReentrantNodeTypes,
        primaryType: 'Node',
      }),
    { message: /before/ },
  );
});

test('reentrancy: a field declared after the nested instance is only checked once the outer instance resumes', t => {
  // `after` comes *after* `items`: the inner instance (nested inside the
  // outer's `items` field) sets `after` first, with no conflict yet (first
  // observation). Only once the outer instance's own loop *resumes* after
  // that nested call returns -- and reaches its own `after` field -- does
  // the now-required-but-missing conflict surface.
  const message = {
    value: 1n,
    items: [{ value: 2n, items: [], after: 'inner-after' }],
    // `after` absent on the outer instance
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types: ReentrantNodeTypes,
        primaryType: 'Node',
      }),
    { message: /after/ },
  );
});

test('reentrancy: optional fields before and after a nested instance are tracked independently', t => {
  // `before` is fully consistent (present at both levels) -- on its own it
  // would resolve cleanly. `after` is inconsistent (inner sets it, outer
  // doesn't). The `before` field resolving without incident must not mask
  // or interfere with `after`'s independent conflict -- confirming state is
  // tracked per field name, not once for the whole type.
  const message = {
    value: 1n,
    before: 'outer-before',
    items: [
      { value: 2n, before: 'inner-before', items: [], after: 'inner-after' },
    ],
    // `after` absent on the outer instance
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types: ReentrantNodeTypes,
        primaryType: 'Node',
      }),
    { message: /after/ },
  );
});

test('reentrancy: an optional self-referential field always conflicts once recursion terminates', t => {
  // Unlike `items` above, `child` here is *optional* and refers to `Node`
  // itself directly (not via an array). The moment any instance sets it,
  // it becomes required for *every* instance of `Node` -- including
  // whichever instance is the terminating leaf of the chain, which by
  // construction can't also set it. This isn't a bug: it's the direct,
  // expected consequence of EIP-712 having one field list per type name
  // (see the module doc comment) applied to a self-referential type -- true
  // recursion with an optional "more to come" field isn't representable
  // this way, only a fixed/bounded shape (like `items` above) is.
  const types = {
    Node: [
      { name: 'value', type: 'uint256' },
      { name: 'child', type: 'Node', optional: true },
    ],
  };
  const message = {
    value: 1n,
    child: { value: 2n }, // no grandchild: terminates the recursion
  };

  t.throws(
    () =>
      normalizeAndValidateEIP712Data({
        message,
        types,
        primaryType: 'Node',
      }),
    { message: /child/ },
  );
});
