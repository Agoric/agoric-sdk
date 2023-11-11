import * as g from './greeter.js';

/**
 * @param {import('ava').Assertions} t
 * @param {import('../src/index.js').Zone} rootZone
 */
export const testMakeOnce = (t, rootZone) => {
  const subZone = rootZone.subZone('sub');
  const a = subZone.makeOnce('a', () => 'A');
  t.is(a, 'A');
  t.throws(() => subZone.makeOnce('a', () => 'A'), {
    message: /has already been used/,
  });
  const nonPassable = harden({
    hello() {
      return 'world';
    },
  });
  t.is(rootZone.isStorable(nonPassable), false);
  t.is(subZone.isStorable(123), true);
  t.throws(() => rootZone.makeOnce('nonPassable', () => nonPassable), {
    message: /is not storable/,
  });
};

// CAUTION: Do not modify this list; it exists to ensure that future versions
// of @agoric/zone are compatible with the baggage created by older versions,
// including the legacy implementation of @agoric/vat-data.
export const agoricVatDataCompatibleKeys = harden(
  [
    'Greeter_kindHandle',
    'GreeterKit_kindHandle',
    'a_kindHandle',
    'a_singleton',
    'mappish',
    'subsub',
  ].sort(),
);

export const testGreeter = (t, nick, obj, adminObj = obj) => {
  t.is(obj.greet('Greetings'), `Greetings, ${nick}`);
  t.is(obj.greet(), `Hello, ${nick}`);
  adminObj.setNick(`${nick}2`);
  t.is(obj.greet('Greetings'), `Greetings, ${nick}2`);
  t.is(obj.greet(), `Hello, ${nick}2`);
  adminObj.setNick(nick);
};

const alreadyExceptionSpec = {
  message: /has already been used/,
};

/**
 * @template T
 * @param {import('ava').Assertions} t
 * @param {() => T} fn
 * @param {*} spec
 * @returns {T}
 */
const secondThrows = (t, fn, spec = alreadyExceptionSpec) => {
  const ret = fn();
  t.throws(fn, spec);
  return ret;
};

/**
 * @param {import('ava').Assertions} t
 * @param {import('../src/index.js').Zone} rootZone
 */
export const testFirstZoneIncarnation = (t, rootZone) => {
  const subZone = secondThrows(t, () => rootZone.subZone('sub'));
  const singly = secondThrows(t, () =>
    g.prepareGreeterSingleton(subZone, 'a', 'Singly'),
  );
  testGreeter(t, 'Singly', singly);

  const makeGreeter = secondThrows(t, () => g.prepareGreeter(subZone));
  const classy = makeGreeter('Classy');
  testGreeter(t, 'Classy', classy);

  const makeGreeterKit = secondThrows(t, () => g.prepareGreeterKit(subZone));

  const { greeter: kitty, admin: kittyAdmin } = makeGreeterKit('Kitty');
  testGreeter(t, 'Kitty', kitty, kittyAdmin);

  const mappish = secondThrows(t, () => subZone.mapStore('mappish'));
  mappish.init('singly', singly);
  mappish.init('classy', classy);
  mappish.init('kitty', kitty);
  mappish.init('kittyAdmin', kittyAdmin);

  secondThrows(t, () => subZone.subZone('subsub'));
};

/**
 * @param {import('ava').Assertions} t
 * @param {import('../src/index.js').Zone} rootZone
 */
export const testSecondZoneIncarnation = (t, rootZone) => {
  const subZone = secondThrows(t, () => rootZone.subZone('sub'));
  const mappish = secondThrows(t, () => subZone.mapStore('mappish'));

  const singlyReload = secondThrows(t, () =>
    g.prepareGreeterSingleton(subZone, 'a', 'Singly'),
  );
  const makeGreeter = secondThrows(t, () => g.prepareGreeter(subZone));
  const makeGreeterKit = secondThrows(t, () => g.prepareGreeterKit(subZone));

  const singly = mappish.get('singly');
  t.is(singlyReload, singly);
  testGreeter(t, 'Singly', singly);
  testGreeter(t, 'Classy', mappish.get('classy'));
  testGreeter(t, 'Kitty', mappish.get('kitty'), mappish.get('kittyAdmin'));

  const classy2 = makeGreeter('Classy2');
  testGreeter(t, 'Classy2', classy2);

  const { greeter: kitty2, admin: kittyAdmin2 } = makeGreeterKit('Kitty2');
  testGreeter(t, 'Kitty2', kitty2, kittyAdmin2);
};
