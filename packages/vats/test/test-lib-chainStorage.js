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
      () => {
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
      () => rootNode.setValue(val),
      undefined,
      `${label} value for root node is rejected`,
    );
  }

  rootNode.clearValue();
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
    const child = rootNode.getChildNode(segment);
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
    child.clearValue();
    t.deepEqual(
      messages.slice(-1),
      [{ key: childPath, method: 'set' }],
      'non-root clearValue message',
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
      () => rootNode.getChildNode(val),
      undefined,
      `${label} segment is rejected`,
    );
  }

  // Level-skipping creation is allowed.
  const childNode = rootNode.getChildNode('child');
  const childPath = `${rootPath}.child`;
  const deepNode = childNode.getChildNode('grandchild');
  const deepPath = `${childPath}.grandchild`;
  t.deepEqual(deepNode.getStoreKey(), {
    storeName: 'swingset',
    storeSubkey: `fake:${deepPath}`,
  });
  for (const [label, val] of nonStrings) {
    t.throws(
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

  childNode.clearValue();
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'set' }],
    'child clearValue message',
  );
  deepNode.clearValue();
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepPath, method: 'set' }],
    'granchild clearValue message',
  );
  childNode.clearValue();
  t.deepEqual(
    messages.slice(-1),
    [{ key: childPath, method: 'set' }],
    'child clearValue message',
  );
});
