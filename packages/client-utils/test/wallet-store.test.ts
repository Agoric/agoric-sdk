import test from 'ava';

import { reflectWalletStore } from '../src/wallet-store.js';

test('reflectWalletStore save/overwrite chains without changing args', async t => {
  const actions: any[] = [];
  let lastId = '';
  const signer = {
    sendBridgeAction: async action => {
      lastId = action.message?.id || '';
      actions.push(action);
      return { code: 0 };
    },
    query: {
      getLastUpdate: async () => ({
        updated: 'invocation',
        id: lastId,
        result: 'ok',
      }),
    },
  };

  const walletStore = reflectWalletStore(
    // @ts-expect-error minimal signer for test
    signer,
    { setTimeout: globalThis.setTimeout, makeNonce: () => '123' },
  );

  const target = walletStore.get<any>('ymaxControl');

  await target.getCreatorFacet('arg1', 2);
  t.is(actions.length, 1);
  t.deepEqual(actions[0].message.args, ['arg1', 2]);
  t.falsy(actions[0].message.saveResult);

  await target.saveAs('creatorFacet').getCreatorFacet('arg2');
  t.is(actions.length, 2);
  t.deepEqual(actions[1].message.args, ['arg2']);
  t.deepEqual(actions[1].message.saveResult, {
    name: 'creatorFacet',
    overwrite: false,
  });

  await target.overwrite('creatorFacet').getCreatorFacet('arg3');
  t.is(actions.length, 3);
  t.deepEqual(actions[2].message.args, ['arg3']);
  t.deepEqual(actions[2].message.saveResult, {
    name: 'creatorFacet',
    overwrite: true,
  });
});
