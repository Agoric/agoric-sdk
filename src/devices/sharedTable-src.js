import harden from '@agoric/harden';

export default function setup(syscall, helpers, endowments) {
  console.log(`in src`, endowments);
  const { table } = endowments;

  function getState() {
    const ret = [];
    table.forEach((value, key) => {
      ret.push([key, value]);
    });
    return ret;
  }

  function setState(newState) {
    if (table.size !== 0) {
      throw new Error('table is not empty');
    }
    newState.forEach((key, value) => {
      table.set(key, value);
    });
  }

  return helpers.makeDeviceSlots(
    syscall,
    SO => harden({
      get(key) {
        return table.get(`${key}`);
      },
      set(key, value) {
        console.log('Hs');
        table.set(`${key}`, `${value}`);
      },
      has(key) {
        return table.has(`${key}`);
      },
    }),
    getState,
    setState,
    helpers.name,
  );
}
