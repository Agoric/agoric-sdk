/**
 * MakeCLists Module
 * This module is instantiated per CommsVat and stores data about
 * mappings between external machines and slots.
 *
 * We need to store the data in two separate groups:
 *  * inbound to a commsvat means we are getting information about an
 *    object that lives on another machine.
 *  * outbound to a commsvat means that we are passing along
 *    information to an another machine
 *
 * a clist maps an index to an object describing a slot
 * for example, one mapping for promises is:
 * resultIndex -> { type: 'promise', id: promiseID }
 *
 * @module makeCLists
 */

export function makeCLists() {
  const state = new Map();

  function createKeyObj(direction, machineName, key) {
    return {
      direction,
      machineName,
      key,
    };
  }

  function createValueObj(direction, value) {
    return {
      direction,
      kernelExport: value,
    };
  }

  function getKernelExport(direction, machineName, key) {
    return state.get(JSON.stringify(createKeyObj(direction, machineName, key)));
  }

  function getMachine(direction, kernelExport) {
    return state.get(JSON.stringify(createValueObj(direction, kernelExport)));
  }

  function add(direction, machineName, key, value) {
    const keyObj = createKeyObj(direction, machineName, key);
    state.set(JSON.stringify(keyObj), value);
    state.set(JSON.stringify(createValueObj(direction, value)), keyObj);
  }

  return {
    getKernelExport,
    getMachine,
    add,
    dump() {
      return state;
    },
  };
}
