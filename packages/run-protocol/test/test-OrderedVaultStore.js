// NB: import with side-effects that sets up Endo global environment
import '@agoric/zoe/exported.js';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeOrderedVaultStore } from '../src/vaultFactory/OrderedVaultStore.js';
import { makeFakeVaultKit } from './supports.js';

const { brand } = makeIssuerKit('ducats');

test('add/remove vault kit', async t => {
  const store = makeOrderedVaultStore();

  const vk1 = makeFakeVaultKit('vkId', AmountMath.makeEmpty(brand));
  t.is(store.getSize(), 0);
  store.addVaultKit('vkId', vk1);
  t.is(store.getSize(), 1);
  store.removeVaultKit('vkId', vk1.vault);
  t.is(store.getSize(), 0);
  // TODO verify that this errors
  // store.removeVaultKit(id); // removing again
});
