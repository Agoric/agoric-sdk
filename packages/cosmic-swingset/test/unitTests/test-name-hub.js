import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeNameHubKit } from '../../lib/ag-solo/vats/nameHub';

test('makeNameHubKit - lookup paths', async t => {
  const { nameAdmin: na1, nameHub: nh1 } = makeNameHubKit();
  const { nameAdmin: na2, nameHub: nh2 } = makeNameHubKit();
  const { nameAdmin: na3, nameHub: nh3 } = makeNameHubKit();

  na1.update('path1', nh2);
  t.is(await nh1.lookup('path1'), nh2);
  na2.update('path2', nh3);
  t.is(await nh2.lookup('path2'), nh3);
  na3.update('path3', 'finish');
  t.is(await nh3.lookup('path3'), 'finish');

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

  // Try reserving and looking up.
  nameAdmin.reserve('hello');

  let lookedUpHello = false;
  const lookupHelloP = nameHub
    .lookup('hello')
    .finally(() => (lookedUpHello = true));

  t.falsy(lookedUpHello);
  nameAdmin.update('hello', 'foo');
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

  nameAdmin.reserve('goodbye');
  let lookedUpGoodbye = false;
  const lookupGoodbyeP = nameHub
    .lookup('bar')
    .finally(() => (lookedUpGoodbye = true));

  t.falsy(lookedUpGoodbye);
  nameAdmin.delete('goodbye');
  await t.throwsAsync(lookupGoodbyeP, {
    message: /"nameKey" not found: .*/,
  });
  t.truthy(lookedUpGoodbye);

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: /"nameKey" not found: .*/,
  });
});
