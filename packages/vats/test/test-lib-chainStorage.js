// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeChainStorageRoot } from '../src/lib-chainStorage.js';
import { makeFakeStorageKit } from '../tools/storage-test-utils.js';

test('makeChainStorageRoot', async t => {
  const rootPath = 'root';
  const { rootNode, messages } = makeFakeStorageKit(rootPath);
  t.deepEqual(
    rootNode.getStoreKey(),
    { storeName: 'swingset', storeSubkey: `fake:${rootPath}` },
    'root store key matches initialization input',
  );

  t.throws(() =>
    makeChainStorageRoot(
      async () => {
        t.fail(
          'toStorage should not have been called for non-"swingset" storeName',
        );
      },
      // @ts-expect-error
      'notswingset',
      rootPath,
    ),
  );

  // Values must be strings.
  const nonStrings = new Map(
    Object.entries({
      number: 1,
      bigint: 1n,
      boolean: true,
      null: null,
      undefined,
      symbol: Symbol('foo'),
      array: ['foo'],
      object: {
        toString() {
          return 'foo';
        },
      },
    }),
  );
  for (const [label, val] of nonStrings) {
    t.throws(
      // @ts-expect-error invalid value
      () => rootNode.setValue(val),
      undefined,
      `${label} value for root node is rejected`,
    );
  }

  rootNode.setValue('');
  rootNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootPath, method: 'set', value: 'foo' }],
    'root node setValue message',
  );
  rootNode.setValue('bar');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootPath, method: 'set', value: 'bar' }],
    'second setValue message',
  );

  // Valid path segments are strings of up to 100 ASCII alphanumeric/dash/underscore characters.
  const validSegmentChars = `${
    Array(26)
      .fill(undefined)
      .map((_, i) => 'a'.charCodeAt(0) + i)
      .map(code => String.fromCharCode(code))
      .join('') +
    Array(26)
      .fill(undefined)
      .map((_, i) => 'A'.charCodeAt(0) + i)
      .map(code => String.fromCharCode(code))
      .join('') +
    Array(10)
      .fill(undefined)
      .map((_, i) => '0'.charCodeAt(0) + i)
      .map(code => String.fromCharCode(code))
      .join('')
  }-_`;
  const extremeSegments =
    validSegmentChars
      .repeat(Math.ceil(100 / validSegmentChars.length))
      .match(/.{1,100}/gsu) || [];
  for (const segment of extremeSegments) {
    const child = rootNode.makeChildNode(segment);
    const childPath = `${rootPath}.${segment}`;
    t.deepEqual(
      child.getStoreKey(),
      { storeName: 'swingset', storeSubkey: `fake:${childPath}` },
      'path segments are dot-separated',
    );
    child.setValue('foo');
    t.deepEqual(
      messages.slice(-1),
      [{ key: childPath, method: 'set', value: 'foo' }],
      'non-root setValue message',
    );
  }

  // Invalid path segments are non-strings, empty, too long, or contain unacceptable characters.
  const badSegments = new Map(nonStrings);
  badSegments.set('empty', '');
  badSegments.set('long', 'x'.repeat(101));
  for (let i = 0; i < 128; i += 1) {
    const segment = String.fromCharCode(i);
    if (!validSegmentChars.includes(segment)) {
      badSegments.set(
        `U+${i.toString(16).padStart(4, '0')} ${JSON.stringify(segment)}`,
        segment,
      );
    }
  }
  badSegments.set('non-ASCII', '\u00E1');
  badSegments.set('ASCII with combining diacritical mark', 'a\u0301');
  for (const [label, val] of badSegments) {
    t.throws(
      // @ts-expect-error invalid value
      () => rootNode.makeChildNode(val),
      undefined,
      `${label} segment is rejected`,
    );
  }

  // Level-skipping creation is allowed.
  const childNode = rootNode.makeChildNode('child');
  const childPath = `${rootPath}.child`;
  const deepNode = childNode.makeChildNode('grandchild');
  const deepPath = `${childPath}.grandchild`;
  t.deepEqual(deepNode.getStoreKey(), {
    storeName: 'swingset',
    storeSubkey: `fake:${deepPath}`,
  });
  for (const [label, val] of nonStrings) {
    t.throws(
      // @ts-expect-error invalid value
      () => deepNode.setValue(val),
      undefined,
      `${label} value for non-root node is rejected`,
    );
  }
  deepNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'set', value: 'foo' }],
    'level-skipping setValue message',
  );

  childNode.setValue('');
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'set', value: '' }],
    'child setValue message',
  );
  deepNode.setValue('');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'set', value: '' }],
    'granchild setValue message',
  );
  childNode.setValue('');
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'set', value: '' }],
    'child setValue message',
  );
});

test('makeChainStorageRoot sequence data', async t => {
  const rootPath = 'root';
  const { rootNode, messages } = makeFakeStorageKit(rootPath, {
    sequence: true,
  });

  // @ts-expect-error
  t.throws(() => rootNode.setValue([]), undefined, 'array value is rejected');

  rootNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootPath, method: 'append', value: 'foo' }],
    'root setValue message',
  );
  rootNode.setValue('bar');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootPath, method: 'append', value: 'bar' }],
    'second setValue message',
  );

  // Child nodes inherit configuration unless overridden.
  let childNode = rootNode.makeChildNode('child');
  const childPath = `${rootPath}.child`;
  let deepNode = childNode.makeChildNode('grandchild');
  const deepPath = `${childPath}.grandchild`;
  childNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'append', value: 'foo' }],
    'auto-sequence child setValue message',
  );
  deepNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'append', value: 'foo' }],
    'auto-sequence grandchild setValue message',
  );
  deepNode = childNode.makeChildNode('grandchild', { sequence: false });
  deepNode.setValue('bar');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'set', value: 'bar' }],
    'manual-single grandchild setValue message',
  );
  childNode = rootNode.makeChildNode('child', { sequence: false });
  childNode.setValue('bar');
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'set', value: 'bar' }],
    'manual-single child setValue message',
  );
  deepNode = childNode.makeChildNode('grandchild');
  deepNode.setValue('baz');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'set', value: 'baz' }],
    'auto-single grandchild setValue message',
  );
  deepNode = childNode.makeChildNode('grandchild', { sequence: true });
  deepNode.setValue('qux');
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'append', value: 'qux' }],
    'manual-sequence grandchild setValue message',
  );
});
