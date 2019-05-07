/**
 * MakeCLists Module
 * This module is instantiated per CommsVat and stores data about
 * mappings between external machines and slots.
 *
 * We need to store the data in two separate groups:
 *  * ingress to a commsvat means we are getting information about an
 *    object that lives on another machine.
 *  * egress from a commsvat means that we are passing along
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
  let nextID = 1;

  function allocateNewID(type) {
    const id = nextID;
    nextID += 1;
    return `comms.${type[0]}.${id}`;
  }

  function checkDirection(direction) {
    if (direction !== 'ingress' && direction !== 'egress') {
      throw new Error(
        `direction should be ingress or egress, not ${direction}`,
      );
    }
  }

  function checkIfAlreadyExists(incomingWireMessageObj, kernelToMeSlot) {
    const slot = state.get(JSON.stringify(incomingWireMessageObj));
    const outgoing = state.get(JSON.stringify(kernelToMeSlot));
    if (slot || outgoing) {
      throw new Error(
        `${JSON.stringify(kernelToMeSlot)} already exists in clist`,
      );
    }
  }

  function getDirectionFromWireMessageSlot(slot) {
    return slot.type.split('-')[1];
  }

  function reverse(direction) {
    if (direction === 'ingress') return 'egress';
    if (direction === 'egress') return 'ingress';
    throw new Error(`direction should be ingress or egress, not ${direction}`);
  }

  const changePerspectiveMap = new Map();
  // youToMe: your-egress, meToYou: your-ingress
  // youToMe: your-ingress, meToYou: your-egress
  changePerspectiveMap.set('your-egress', 'your-ingress');
  changePerspectiveMap.set('your-ingress', 'your-egress');

  function changePerspective(slot) {
    const otherPerspective = changePerspectiveMap.get(slot.type);
    if (otherPerspective === undefined) {
      throw new Error(`slot type ${slot.type} is not an allowed type`);
    }
    return {
      type: otherPerspective,
      id: slot.id,
    };
  }

  function createIncomingWireMessageObj(
    otherMachineName,
    direction,
    youToMeSlot,
  ) {
    return {
      otherMachineName,
      direction,
      youToMeSlot,
    };
  }

  function createOutgoingWireMessageObj(
    otherMachineName,
    direction,
    meToYouSlot,
  ) {
    return {
      otherMachineName,
      direction,
      meToYouSlot,
    };
  }

  // takes youToMeSlot, returns kernelToMeSlot
  function mapIncomingWireMessageToKernelSlot(
    otherMachineName,
    direction,
    youToMeSlot,
  ) {
    checkDirection(direction);
    return state.get(
      JSON.stringify(
        createIncomingWireMessageObj(otherMachineName, direction, youToMeSlot),
      ),
    );
  }

  // takes kernelToMeSlot, returns meToYouSlot
  // we don't know the otherMachineName or direction
  function mapKernelSlotToOutgoingWireMessage(kernelToMeSlot) {
    return state.get(JSON.stringify(kernelToMeSlot));
  }

  // kernelToMeSlot can have type: import, export or promise

  // right, egress, {type:import,id:10}, {type:yourEgress, id:7},
  // {type:yourIngress, id:7}

  // we will use this in the following ways:
  // 1) to send out information about something that we know as a
  //    kernelToMeSlot - we will need to allocate an id if it doesn't
  //    already exist and then get the 'meToYouSlot' to send over the
  //    wire
  // 2) to translate something that we get over the wire (youToMeSlot)
  //    into a kernelToMeSlot.
  function add(
    otherMachineName,
    direction,
    kernelToMeSlot,
    youToMeSlot,
    meToYouSlot,
  ) {
    checkDirection(direction);
    const incomingWireMessageObj = createIncomingWireMessageObj(
      otherMachineName,
      direction,
      youToMeSlot,
    );
    const outgoingWireMessageObj = createOutgoingWireMessageObj(
      otherMachineName,
      direction,
      meToYouSlot,
    );
    checkIfAlreadyExists(
      incomingWireMessageObj,
      outgoingWireMessageObj,
      kernelToMeSlot,
    );
    state.set(JSON.stringify(kernelToMeSlot), outgoingWireMessageObj);
    state.set(JSON.stringify(incomingWireMessageObj), kernelToMeSlot);
  }

  function mapKernelSlotToOutgoingWireMessageOrCreate(
    otherMachineName,
    direction,
    kernelToMeSlot,
  ) {
    const outgoingWireMessage = mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
    );
    if (outgoingWireMessage === undefined) {
      const newID = allocateNewID(direction);
      add(
        otherMachineName,
        direction,
        kernelToMeSlot,
        { type: `your-${direction}`, id: newID }, // youToMeSlot
        { type: `your-${reverse(direction)}`, id: newID }, // meToYouSlot
      );
    }
    return mapKernelSlotToOutgoingWireMessage(kernelToMeSlot);
  }

  return {
    mapIncomingWireMessageToKernelSlot,
    mapKernelSlotToOutgoingWireMessage,
    mapKernelSlotToOutgoingWireMessageOrCreate,
    changePerspective,
    add,
    getDirectionFromWireMessageSlot,
    dump() {
      return state;
    },
  };
}
