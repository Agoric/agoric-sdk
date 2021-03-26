import '@agoric/install-ses';
import test from 'ava';

import { makeNameHubKit } from '../../lib/ag-solo/vats/nameHub';

test('makeNameHubKit - reserve and update', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  await t.throwsAsync(() => nameHub.lookup('hello'), {
    message: '"nameKey" not found: (a string)',
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
    message: '"nameKey" not found: (a string)',
  });

  nameAdmin.reserve('goodbye');
  let lookedUpGoodbye = false;
  const lookupGoodbyeP = nameHub
    .lookup('bar')
    .finally(() => (lookedUpGoodbye = true));

  t.falsy(lookedUpGoodbye);
  nameAdmin.delete('goodbye');
  await t.throwsAsync(lookupGoodbyeP, {
    message: '"nameKey" not found: (a string)',
  });
  t.truthy(lookedUpGoodbye);

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: '"nameKey" not found: (a string)',
  });
});
