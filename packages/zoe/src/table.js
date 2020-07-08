/* global harden */

import makeStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';

export const makeTable = (
  validateFn,
  key = undefined,
  makeCustomMethodsFn = () => undefined,
) => {
  // The WeakMap that stores the records
  const handleToRecord = makeStore(key);

  const table = harden({
    validate: validateFn,
    create: (record, handle = harden({})) => {
      record = harden({
        ...record,
        handle, // reliably add the handle to the record
      });
      table.validate(record);
      handleToRecord.init(handle, record);
      return handle;
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
    delete: handleToRecord.delete,
    update: (handle, partialRecord) => {
      const record = handleToRecord.get(handle);
      const updatedRecord = harden({
        ...record,
        ...partialRecord,
      });
      table.validate(updatedRecord);
      handleToRecord.set(handle, updatedRecord);
      return handle;
    },
  });

  const customMethodsTable = harden({
    ...makeCustomMethodsFn(table),
    ...table,
  });
  return customMethodsTable;
};

export const makeValidateProperties = ([...expectedProperties]) => {
  // add handle to expected properties
  expectedProperties.push('handle');
  // Sorts in-place
  expectedProperties.sort();
  harden(expectedProperties);
  return obj => {
    const actualProperties = Object.getOwnPropertyNames(obj);
    actualProperties.sort();
    assert(
      actualProperties.length === expectedProperties.length,
      details`the actual properties (${actualProperties}) did not match the \
      expected properties (${expectedProperties})`,
    );
    for (let i = 0; i < actualProperties.length; i += 1) {
      assert(
        expectedProperties[i] === actualProperties[i],
        details`property '${expectedProperties[i]}' did not equal actual property '${actualProperties[i]}'`,
      );
    }
    return true;
  };
};
