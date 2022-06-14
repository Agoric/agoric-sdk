// @ts-check

// eslint-disable-next-line import/order
import { test } from './prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { Far, makeMarshal } from '@endo/marshal';
import { makeSubscriptionKit, makeStoredSubscription } from '../src/index.js';

import '../src/types.js';
import { jsonPairs } from './marshal-corpus.js';

const makeFakeStorage = (path, publication) => {
  const fullPath = `publish.${path}`;
  const storeKey = harden({
    storeName: 'swingset',
    storeSubkey: `swingset/data:${fullPath}`,
  });
  /** @type {StorageNode} */
  const storage = Far('fakeStorage', {
    getStoreKey: () => storeKey,
    setValue: value => {
      assert.typeof(value, 'string');
      publication.updateState(value);
    },
    getChildNode: () => storage,
  });
  return storage;
};

test('stored subscription', async t => {
  t.plan((jsonPairs.length + 2) * 4 + 1);

  /** @type {any} */
  const initialValue = 'first value';
  const { publication: pubStorage, subscription: subStorage } =
    makeSubscriptionKit();
  const storage = makeFakeStorage('publish.foo.bar', pubStorage);
  const { subscription, publication } = makeSubscriptionKit(initialValue);
  const storesub = makeStoredSubscription(subscription, storage);

  t.deepEqual(await E(storesub).getStoreKey(), {
    subscription,
    ...(await E(storage).getStoreKey()),
  });
  const unserializer = E(storesub).getUnserializer();

  const ait = E(storesub)[Symbol.asyncIterator]();
  const storeAit = subStorage[Symbol.asyncIterator]();

  const { unserialize } = makeMarshal();
  const check = async (description, origValue, expectedDone) => {
    const { done: storedDone, value: storedEncoded } = await storeAit.next();
    t.assert(!storedDone, `check not stored done for ${description}`);
    const storedDecoded = JSON.parse(storedEncoded);
    const storedValue = await E(unserializer).unserialize(storedDecoded);
    t.deepEqual(
      storedValue,
      origValue,
      `check stored value against original ${description}`,
    );

    const { done, value } = await E(ait).next();
    t.is(done, expectedDone, `check doneness for ${description}`);
    t.deepEqual(
      value,
      origValue,
      `check value against original ${description}`,
    );
  };

  await check(initialValue, initialValue, false);
  for await (const [encoded] of jsonPairs) {
    const origValue = unserialize({ body: encoded, slots: [] });
    await E(publication).updateState(origValue);
    await check(encoded, origValue, false);
  }

  const terminalNull = null;
  await E(publication).finish(terminalNull);
  await check('terminal null', terminalNull, true);
});
