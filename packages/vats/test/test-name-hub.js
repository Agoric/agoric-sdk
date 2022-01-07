import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeNameHubKit } from '../src/nameHub.js';

test('makeNameHubKit - lookup paths', async t => {
  const { nameAdmin: na1, nameHub: nh1 } = makeNameHubKit();
  const { nameAdmin: na2, nameHub: nh2 } = makeNameHubKit();
  const { nameAdmin: na3, nameHub: nh3 } = makeNameHubKit();

  t.deepEqual(nh1.keys(), []);
  t.deepEqual(nh1.values(), []);
  t.deepEqual(nh1.entries(), []);
  t.deepEqual(nh2.keys(), []);
  t.deepEqual(nh2.values(), []);
  t.deepEqual(nh2.entries(), []);
  t.deepEqual(nh3.keys(), []);
  t.deepEqual(nh3.values(), []);
  t.deepEqual(nh3.entries(), []);

  na1.update('path1', nh2);
  t.is(await nh1.lookup('path1'), nh2);
  na2.update('path2', nh3);
  t.is(await nh2.lookup('path2'), nh3);
  na3.update('path3', 'finish');
  t.is(await nh3.lookup('path3'), 'finish');

  t.deepEqual(nh1.keys(), ['path1']);
  t.deepEqual(nh1.values(), [nh2]);
  t.deepEqual(nh1.entries(), [['path1', nh2]]);
  t.deepEqual(nh2.keys(), ['path2']);
  t.deepEqual(nh2.values(), [nh3]);
  t.deepEqual(nh2.entries(), [['path2', nh3]]);
  t.deepEqual(nh3.keys(), ['path3']);
  t.deepEqual(nh3.values(), ['finish']);
  t.deepEqual(nh3.entries(), [['path3', 'finish']]);

  t.is(await nh1.lookup(), nh1);
  t.is(await nh1.lookup('path1'), nh2);
  t.is(await nh1.lookup('path1', 'path2'), nh3);
  t.is(await nh1.lookup('path1', 'path2', 'path3'), 'finish');
  await t.throwsAsync(() => nh1.lookup('path1', 'path2', 'path3', 'path4'), {
    message: /^target has no method "lookup", has/,
  });
});

test('makeNameHubKit - reserve and update', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  await t.throwsAsync(() => nameHub.lookup('hello'), {
    message: /"nameKey" not found: .*/,
  });

  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);

  // Try reserving and looking up.
  nameAdmin.reserve('hello');

  let lookedUpHello = false;
  const lookupHelloP = nameHub
    .lookup('hello')
    .finally(() => (lookedUpHello = true));
  t.deepEqual(nameHub.keys(), ['hello']);
  const helloP = nameHub.values()[0];
  t.assert(helloP instanceof Promise);
  t.deepEqual(nameHub.entries(), [['hello', helloP]]);

  t.falsy(lookedUpHello);
  nameAdmin.update('hello', 'foo');
  t.deepEqual(nameHub.keys(), ['hello']);
  t.deepEqual(nameHub.values(), ['foo']);
  t.deepEqual(nameHub.entries(), [['hello', 'foo']]);
  t.is(await lookupHelloP, 'foo');
  t.truthy(lookedUpHello);

  nameAdmin.update('hello', 'foo2');
  t.is(await nameHub.lookup('hello'), 'foo2');
});

test('makeNameHubKit - reserve and delete', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: /"nameKey" not found: .*/,
  });

  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);

  nameAdmin.reserve('goodbye');
  let lookedUpGoodbye = false;
  const lookupGoodbyeP = nameHub
    .lookup('bar')
    .finally(() => (lookedUpGoodbye = true));

  t.falsy(lookedUpGoodbye);
  t.deepEqual(nameHub.keys(), ['goodbye']);
  const goodbyeP = nameHub.values()[0];
  t.assert(goodbyeP instanceof Promise);
  t.deepEqual(nameHub.entries(), [['goodbye', goodbyeP]]);

  nameAdmin.delete('goodbye');
  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);
  await t.throwsAsync(lookupGoodbyeP, {
    message: /"nameKey" not found: .*/,
  });
  t.truthy(lookedUpGoodbye);

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: /"nameKey" not found: .*/,
  });
});
