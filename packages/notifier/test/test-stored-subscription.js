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
  t.plan((jsonPairs.length + 1) * 4 + 1);
  const { publication: pubStorage, subscription: subStorage } =
    makeSubscriptionKit();
  const storage = makeFakeStorage('publish.foo.bar', pubStorage);
  const { subscription, publication } = makeSubscriptionKit();
  const storesub = makeStoredSubscription(subscription, storage);

  t.is(await E(storesub).getStoreKey(), await E(storage).getStoreKey());
  const unserializer = E(storesub).getUnserializer();

  const ait = E(storesub)[Symbol.asyncIterator]();
  const storeAit = subStorage[Symbol.asyncIterator]();

  const { unserialize } = makeMarshal();
  const updateAndCheck = async (description, origValue, expectDone) => {
    const nextP = E(ait).next();
    if (expectDone) {
      await E(publication).finish(origValue);
    } else {
      await E(publication).updateState(origValue);
    }

    const { done, value } = await nextP;
    t.is(done, expectDone, `check doneness for ${description}`);
    t.deepEqual(
      value,
      origValue,
      `check value against original ${description}`,
    );

    const { done: storedDone, value: storedEncoded } = await storeAit.next();
    t.assert(!storedDone, `check not stored done for ${description}`);
    const storedDecoded = JSON.parse(storedEncoded);
    const storedValue = await E(unserializer).unserialize(storedDecoded);
    t.deepEqual(
      storedValue,
      origValue,
      `check stored value against original ${description}`,
    );
  };

  for await (const [encoded] of jsonPairs) {
    const origValue = unserialize({ body: encoded, slots: [] });
    await updateAndCheck(encoded, origValue, false);
  }

  await updateAndCheck('terminal', null, true);
});
