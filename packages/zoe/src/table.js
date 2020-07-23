import makeWeakStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';

import '../exported';
import './internal-types';

// This definition is used to ensure the proper typing of
// makeCustomMethodsFn.
const DEFAULT_CUSTOM_METHODS = () => ({});

/**
 * Create an opaque handle object.
 *
 * @template {string} H
 * @param {H} handleType the string literal type of the handle
 */
export const makeHandle = handleType => {
  // This assert ensures that handleType is referenced.
  assert.typeof(handleType, 'string', 'handleType must be a string');
  // Return the intersection type (really just an empty object).
  return /** @type {Handle<H>} */ (harden({}));
};

/**
 * @template T
 * @template U
 * @param {(record: any) => record is T} validateFn
 * @param {string?} key
 * @param {(table: Table<T>) => U} makeCustomMethodsFn
 * @return {Table<T> & U}
 */
export const makeTable = (
  validateFn,
  key = undefined,
  makeCustomMethodsFn = DEFAULT_CUSTOM_METHODS,
) => {
  // The WeakMap that stores the records
  /**
   * @type {WeakStore<{},T>}
   */
  const handleToRecord = makeWeakStore(key);

  /** @type {Table<T>} */
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

  /** @type {typeof table & U} */
  const customMethodsTable = harden({
    ...makeCustomMethodsFn(table),
    ...table,
  });
  return customMethodsTable;
};

/**
 * @template T
 * @param {string[]} param0
 * @returns {Validator<T>}
 */
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
