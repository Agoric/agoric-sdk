// This file defines some "device drivers" that could be used in calls to
// `controller.addVat`

export function buildSharedStringTable() {
  const sharedTable = new Map();

  function attenuatorSource(e) {
    const { table } = e;
    // eslint-disable-next-line global-require
    const harden = require('@agoric/harden');
    return harden({
      get(key) {
        return table.get(`${key}`);
      },
      set(key, value) {
        table.set(`${key}`, `${value}`);
      },
      has(key) {
        return table.has(`${key}`);
      },
    });
  }

  return {
    attenuatorSource: `(${attenuatorSource})`,
    table: sharedTable,
  };
}
