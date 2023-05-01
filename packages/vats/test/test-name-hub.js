// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeScalarBigMapStore, provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E, Far } from '@endo/far';
import { makeNameHubKit, prepareNameHubKit } from '../src/nameHub.js';

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

  t.is(na1.readonly(), nh1);
  t.is(na2.readonly(), nh2);
  t.is(na3.readonly(), nh3);

  await na1.update('path1', nh2, na2);
  console.log('@@@entries?', nh1.entries());
  t.is(await nh1.lookup('path1'), nh2);
  await na2.update('path2', nh3, na3);
  t.is(await nh2.lookup('path2'), nh3);
  await na3.update('path3', 'finish');
  t.is(await nh3.lookup('path3'), 'finish');

  await na1
    .lookupAdmin('path1', 'path2')
    .then(na3b => na3b.update('path3', 'finish2'));

  t.deepEqual(nh1.keys(), ['path1']);
  t.deepEqual(nh1.values(), [nh2]);
  t.deepEqual(nh1.entries(), [['path1', nh2]]);
  t.deepEqual(nh2.keys(), ['path2']);
  t.deepEqual(nh2.values(), [nh3]);
  t.deepEqual(nh2.entries(), [['path2', nh3]]);
  t.deepEqual(nh3.keys(), ['path3']);
  t.deepEqual(nh3.values(), ['finish2']);
  t.deepEqual(nh3.entries(), [['path3', 'finish2']]);

  t.is(await nh1.lookup(), nh1);
  t.is(await nh1.lookup('path1'), nh2);
  t.is(await nh1.lookup('path1', 'path2'), nh3);
  t.is(await nh1.lookup('path1', 'path2', 'path3'), 'finish2');
  await t.throwsAsync(() => nh1.lookup('path1', 'path2', 'path3', 'path4'), {
    message: /^target has no method "lookup", has/,
  });
});

test('makeNameHubKit - reserve and update', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  t.is(nameAdmin.readonly(), nameHub);

  await t.throwsAsync(() => nameHub.lookup('hello'), {
    message: /"nameKey" not found: .*/,
  });

  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);

  // Try reserving and looking up.
  await nameAdmin.reserve('hello');

  let lookedUpHello = false;
  const lookupHelloP = nameHub
    .lookup('hello')
    .finally(() => (lookedUpHello = true));
  t.deepEqual(nameHub.keys(), ['hello']);
  const helloP = nameHub.values()[0];
  t.assert(helloP instanceof Promise);
  t.deepEqual(nameHub.entries(), [['hello', helloP]]);

  t.falsy(lookedUpHello);
  await nameAdmin.update('hello', 'foo');
  t.deepEqual(nameHub.keys(), ['hello']);
  t.deepEqual(nameHub.values(), ['foo']);
  t.deepEqual(nameHub.entries(), [['hello', 'foo']]);
  t.is(await lookupHelloP, 'foo');
  t.truthy(lookedUpHello);

  await nameAdmin.update('hello', 'foo2');
  t.is(await nameHub.lookup('hello'), 'foo2');
});

test('makeNameHubKit - reserve and delete', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  t.is(nameAdmin.readonly(), nameHub);

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: /"nameKey" not found: .*/,
  });

  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);

  await nameAdmin.reserve('goodbye');
  let lookedUpGoodbye = false;
  const lookupGoodbyeP = nameHub
    .lookup('goodbye')
    .finally(() => (lookedUpGoodbye = true));

  t.falsy(lookedUpGoodbye);
  t.deepEqual(nameHub.keys(), ['goodbye']);
  const goodbyeP = nameHub.values()[0];
  t.assert(goodbyeP instanceof Promise);
  t.deepEqual(nameHub.entries(), [['goodbye', goodbyeP]]);

  await nameAdmin.delete('goodbye');
  t.deepEqual(nameHub.keys(), []);
  t.deepEqual(nameHub.values(), []);
  t.deepEqual(nameHub.entries(), []);
  await t.throwsAsync(lookupGoodbyeP, {
    message: /Value has been deleted/,
  });
  t.truthy(lookedUpGoodbye);

  await t.throwsAsync(() => nameHub.lookup('goodbye'), {
    message: /"nameKey" not found: .*/,
  });
});

test('makeNameHubKit - default and set', async t => {
  const { nameAdmin, nameHub } = makeNameHubKit();

  t.is(nameAdmin.readonly(), nameHub);

  t.is(await nameAdmin.default('defaulted', 'defaultValue'), 'defaultValue');
  await nameAdmin.update('already set', 'initial');
  t.is(await nameAdmin.readonly().lookup('already set'), 'initial');
  t.is(await nameAdmin.default('already set'), 'initial');
  await nameAdmin.set('already set', 'new');
  t.is(await nameAdmin.readonly().lookup('already set'), 'new');
  t.is(await nameAdmin.default('already set'), 'new');
  await t.throwsAsync(() => nameAdmin.set('not set', 'irrelevant'), {
    message: 'key "not set" is not already initialized',
  });
});

test('makeNameHubKit - listen for updates', async t => {
  const { nameAdmin } = makeNameHubKit();

  const brandBLD = harden({ name: 'BLD' });
  await nameAdmin.update('BLD', brandBLD);

  const capture = [];
  nameAdmin.onUpdate(
    Far('onUpdate', { write: entries => capture.push(entries) }),
  );

  const brandIST = harden({ name: 'IST' });
  await E(nameAdmin).update('IST', brandIST);
  await E(nameAdmin).reserve('AUSD');

  await E(nameAdmin).delete('BLD');

  t.deepEqual(capture, [
    [
      ['BLD', brandBLD],
      ['IST', brandIST],
    ],
    [['IST', brandIST]],
  ]);
});

test('durable NameHubKit', async t => {
  const baggage = makeScalarBigMapStore('test baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const z1 = zone.subZone('z1');
  const makeKit = prepareNameHubKit(z1);

  // 1st incarnation
  {
    const { nameAdmin } = provide(baggage, 'it', makeKit);
    await nameAdmin.update('hello', 'world');
  }

  // 2nd incarnation
  {
    const { nameHub } = provide(baggage, 'it', makeKit);
    const actual = await nameHub.lookup('hello');
    t.is(actual, 'world');
  }
});

test('durable MyAddressNameAdmin', async t => {
  const baggage = makeScalarBigMapStore('test baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const makeKit = prepareNameHubKit(zone);

  const { nameAdmin } = makeKit('agoric123');

  const actual = await nameAdmin.getMyAddress();

  t.is(actual, 'agoric123');
});

test('nameAdmin provideChild', async t => {
  const baggage = makeScalarBigMapStore('test baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const makeKit = prepareNameHubKit(zone);

  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } = makeKit();
  const child = await namesByAddressAdmin.provideChild(
    'ag123',
    ['depositFacet'],
    'ag123',
  );
  await child.nameAdmin.update('depositFacet', 'D1');
  {
    const actual = await namesByAddress.lookup('ag123', 'depositFacet');
    t.is(actual, 'D1');
  }
  {
    const actual = await child.nameAdmin.getMyAddress();
    t.is(actual, 'ag123');
  }
});
