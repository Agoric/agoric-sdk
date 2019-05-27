import harden from '@agoric/harden';

export default function setup(syscall, helpers, endowments) {
  console.log(`in src`, endowments);
  const { kvstore } = endowments;

  kvstore.set('deviceState.table', []);

  function getState() {
    const arrayTable = kvstore.get('deviceState.table');
    const tableMap = new Map();
    arrayTable.forEach(([value, key]) => {
      tableMap.set(key, value);
    });
    return tableMap;
  }

  function setState(newState) {
    const table = kvstore.get('deviceState.table');
    if (table.length !== 0) {
      throw new Error('table is not empty');
    }
    newState.forEach((value, key) => {
      table.push([key, value]);
    });
    kvstore.set('deviceState.table', table);
  }

  function resetState(newState) {
    const table = kvstore.get('deviceState.table');
    newState.forEach((key, value) => {
      table.push([key, value]);
    });
    kvstore.set('deviceState.table', table);
  }

  return helpers.makeDeviceSlots(
    syscall,
    _SO =>
      harden({
        get(key) {
          const table = getState();
          return table.get(`${key}`);
        },
        set(key, value) {
          console.log('Hs');
          const table = getState();
          table.set(`${key}`, `${value}`);
          resetState(table);
        },
        has(key) {
          const table = getState();
          return table.has(`${key}`);
        },
      }),
    getState,
    setState,
    helpers.name,
  );
}
