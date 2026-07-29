import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';

import { normalizeEIP712Data } from '../../src/utils/viem-utils/eip712-normalize.js';

test('no-op round trip for a fully-conforming message', t => {
  const types = {
    Mail: [
      { name: 'from', type: 'string' },
      { name: 'contents', type: 'string' },
    ],
  };
  const message = { from: 'alice', contents: 'hi' };

  const result = normalizeEIP712Data({ message, types, primaryType: 'Mail' });

  t.deepEqual(result, { message, types });
});

test('drops an extra top-level field by default', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message = { contents: 'hi', adminOverride: true };

  const result = normalizeEIP712Data({ message, types, primaryType: 'Mail' });

  t.deepEqual(result.message, { contents: 'hi' });
});

test('throws on an extra top-level field with onExtraField: "throw"', t => {
  const types = {
    Mail: [{ name: 'contents', type: 'string' }],
  };
  const message = { contents: 'hi', adminOverride: true };

  t.throws(
    () =>
      normalizeEIP712Data(
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
      normalizeEIP712Data(
        { message, types, primaryType: 'Mail' },
        { onExtraField: 'throw' },
      ),
    { message: /extra1, extra2/ },
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

  const result = normalizeEIP712Data({ message, types, primaryType: 'Mail' });

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

  const dropped = normalizeEIP712Data({ message, types, primaryType: 'Mail' });
  t.deepEqual(dropped.message, { from: { name: 'alice' } });

  t.throws(
    () =>
      normalizeEIP712Data(
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

  const dropped = normalizeEIP712Data({
    message,
    types,
    primaryType: 'Group',
  });
  t.deepEqual(dropped.message, { members: ['a', 'b'] });

  t.throws(
    () =>
      normalizeEIP712Data(
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

  const result = normalizeEIP712Data(
    { message, types, primaryType: 'Group' },
    { onExtraField: 'throw' },
  );
  t.deepEqual(result.message, message);
});

test('optional field observed on only one of several instances of a repeated type', t => {
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

  const result = normalizeEIP712Data({
    message,
    types,
    primaryType: 'Batch',
  });

  // observed at least once => kept, required (optional marker stripped)
  t.deepEqual(result.types.Widget, [
    { name: 'id', type: 'uint256' },
    { name: 'label', type: 'string' },
  ]);
  t.deepEqual(result.message, {
    widgets: [{ id: 1n, label: 'first' }, { id: 2n }],
  });
  // the second instance is missing a now-required field: a real EIP-712
  // validator (not this function) would reject it.
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

  const result = normalizeEIP712Data({
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

  const withoutAttachment = normalizeEIP712Data({
    message: { contents: 'hi' },
    types,
    primaryType: 'Mail',
  });
  t.deepEqual(withoutAttachment.types.Mail, [
    { name: 'contents', type: 'string' },
  ]);
  t.falsy(withoutAttachment.types.Attachment);
  t.falsy(withoutAttachment.types.Blob);

  const withAttachment = normalizeEIP712Data({
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

  const result = normalizeEIP712Data({
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

  const result = normalizeEIP712Data(
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

  const result = normalizeEIP712Data(
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

  const result = normalizeEIP712Data({ message, types, primaryType: 'Batch' });

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

  const result = normalizeEIP712Data({ message, types, primaryType: 'Batch' });

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
      normalizeEIP712Data(
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

  const result = normalizeEIP712Data({ message, types, primaryType: 'Weird' });

  t.deepEqual(result.message, { '0': 'a', '1': 'b', length: 2 });
});

test('an array-like object (not a real Array) can satisfy an array type', t => {
  const types = {
    Group: [{ name: 'members', type: 'string[]' }],
  };
  // Plain object with numeric-index properties and an explicit `length`,
  // `Array.isArray` is false for it, but it's still walkable as an array.
  const message = { members: { 0: 'a', 1: 'b', length: 2 } };

  const result = normalizeEIP712Data({ message, types, primaryType: 'Group' });

  t.deepEqual(result.message.members, ['a', 'b']);
});
