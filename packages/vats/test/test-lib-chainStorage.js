// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeChainStorageRoot } from '../src/lib-chainStorage.js';

test('makeChainStorageRoot', async t => {
  // Instantiate chain storage over a simple in-memory implementation.
  const data = new Map();
  const messages = [];
  // eslint-disable-next-line consistent-return
  const toStorage = message => {
    messages.push(message);
    switch (message.method) {
      case 'set':
        if ('value' in message) {
          data.set(message.key, message.value);
        } else {
          data.delete(message.key);
        }
        break;
      case 'size':
        // Intentionally incorrect because it counts non-child descendants,
        // but nevertheless supports a "has children" test.
        return [...data.keys()].filter(k => k.startsWith(`${message.key}.`))
          .length;
      default:
        throw new Error(`unsupported method: ${message.method}`);
    }
  };
  const rootKey = 'root';
  const rootNode = makeChainStorageRoot(toStorage, rootKey);
  t.is(rootNode.getKey(), rootKey, 'root key matches initialization input');

  // Values must be strings.
  const nonStrings = new Map([
    ['number', 1],
    ['bigint', 1n],
    ['boolean', true],
    ['null', null],
    ['undefined', undefined],
    ['symbol', Symbol('foo')],
    ['array', ['foo']],
    [
      'object',
      {
        toString() {
          return 'foo';
        },
      },
    ],
  ]);
  for (const [label, val] of nonStrings) {
    t.throws(
      () => rootNode.setValue(val),
      undefined,
      `${label} value for root node is rejected`,
    );
  }

  // The root node cannot be deleted, but is otherwise normal.
  await t.throwsAsync(
    rootNode.delete(),
    undefined,
    'root node deletion is disallowed',
  );
  rootNode.setValue('foo');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootKey, method: 'set', value: 'foo' }],
    'root node setValue message',
  );
  rootNode.setValue('bar');
  t.deepEqual(
    messages.slice(-1),
    [{ key: rootKey, method: 'set', value: 'bar' }],
    'second setValue message',
  );

  // Valid key segments are strings of up to 100 ASCII alphanumeric/underscore characters.
  const validSegmentChars = `${
    String.fromCharCode(
      ...Array(26)
        .fill()
        .map((_, i) => 'a'.charCodeAt(0) + i),
    ) +
    String.fromCharCode(
      ...Array(26)
        .fill()
        .map((_, i) => 'A'.charCodeAt(0) + i),
    ) +
    String.fromCharCode(
      ...Array(10)
        .fill()
        .map((_, i) => '0'.charCodeAt(0) + i),
    )
  }_`;
  const extremeSegments = validSegmentChars
    .repeat(Math.ceil(100 / validSegmentChars.length))
    .match(/.{1,100}/gsu);
  for (const segment of extremeSegments) {
    const child = rootNode.getChildNode(segment);
    const childKey = `${rootKey}.${segment}`;
    t.is(child.getKey(), childKey, 'key segments are dot-separated');
    child.setValue('foo');
    t.deepEqual(
      messages.slice(-1),
      [{ key: childKey, method: 'set', value: 'foo' }],
      'non-root setValue message',
    );
    // eslint-disable-next-line no-await-in-loop
    await child.delete();
    t.deepEqual(
      messages.slice(-1),
      [{ key: childKey, method: 'set' }],
      'non-root delete message',
    );
  }

  // Invalid key segments are non-strings, empty, too long, or contain unacceptable characters.
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
  const childKey = `${rootKey}.child`;
  const deepNode = childNode.getChildNode('grandchild');
  const deepKey = `${childKey}.grandchild`;
  t.is(deepNode.getKey(), deepKey);
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
    [{ key: deepKey, method: 'set', value: 'foo' }],
    'level-skipping setValue message',
  );

  // Deletion requires absence of children.
  await t.throwsAsync(
    childNode.delete(),
    undefined,
    'deleting a node with a child is disallowed',
  );
  await deepNode.delete();
  t.deepEqual(
    messages.slice(-1),
    [{ key: deepKey, method: 'set' }],
    'granchild delete message',
  );
  await childNode.delete();
  t.deepEqual(
    messages.slice(-1),
    [{ key: childKey, method: 'set' }],
    'child delete message',
  );
});
