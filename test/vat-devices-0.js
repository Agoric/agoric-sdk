import harden from '@agoric/harden';

export default function setup(syscall, state, helpers, devices) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  const { sharedTable: table } = devices;
  if (table.has('loaded')) {
    table.set('loaded', `${table.get('loaded')}+`);
  } else {
    table.set('loaded', 'first');
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    _E =>
      harden({
        set(key, value) {
          log(`vat set ${key}=${value}`);
          table.set(key, value);
        },
        get(key) {
          const value = table.get(key);
          log(`vat get ${key}=${value}`);
          return value;
        },
      }),
    helpers.vatID,
  );
}
