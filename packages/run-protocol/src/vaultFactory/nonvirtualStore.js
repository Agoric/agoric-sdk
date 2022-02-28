/**
 * Ersatz defineKind until virtual objects system is stable.
 *
 * @param {string} tag
 * @param {Function} init
 * @param {Function} actualize
 * @param {Function} [finish]
 */
const defineKind = (tag, init, actualize, finish) => {
  let nextInstanceID = 1;
  const propertyNames = new Set();

  function makeRepresentative(innerSelf) {
    const wrappedData = {};
    for (const prop of propertyNames) {
      Object.defineProperty(wrappedData, prop, {
        get: () => {
          return innerSelf.rawData[prop];
        },
        set: value => {
          innerSelf.rawData[prop] = value;
        },
      });
    }
    harden(wrappedData);

    const representative = actualize(wrappedData);
    return [representative, wrappedData];
  }

  function makeNewInstance(...args) {
    const objID = `nonvirtual/${nextInstanceID}`;
    nextInstanceID += 1;
    const initialData = init ? init(...args) : {};
    const rawData = {};
    for (const prop of Object.getOwnPropertyNames(initialData)) {
      const data = initialData[prop];
      rawData[prop] = data;
      propertyNames.add(prop);
    }
    const innerSelf = { objID, rawData };
    const [initialRepresentative, wrappedData] = makeRepresentative(innerSelf);
    if (finish) {
      finish(wrappedData, initialRepresentative);
    }
    return initialRepresentative;
  }

  return makeNewInstance;
};

harden(defineKind);
export { defineKind };
