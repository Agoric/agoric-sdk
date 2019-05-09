/**
 * MakeCLists Module
 * This module is instantiated per CommsVat and stores data about
 * mappings between external machines and slots.
 *
 * a clist maps an index to an object describing a slot
 * for example, one mapping for promises is:
 * resultIndex -> { type: 'promise', id: promiseID }
 *
 * @module makeCLists
 */

export function makeCLists() {
  const state = new Map();

  function checkIfAlreadyExists(incomingWireMessageObj, kernelToMeSlot) {
    const slot = state.get(JSON.stringify(incomingWireMessageObj));
    const outgoing = state.get(JSON.stringify(kernelToMeSlot));
    if (slot || outgoing) {
      throw new Error(
        `${JSON.stringify(kernelToMeSlot)} already exists in clist`,
      );
    }
  }

  const changePerspectiveMap = new Map();
  // youToMe: your-egress, meToYou: your-ingress
  // youToMe: your-ingress, meToYou: your-egress
  // youToMe: your-answer, meToYou: your-question
  // youToMe: your-question, meToYou: your-answer
  changePerspectiveMap.set('your-egress', 'your-ingress');
  changePerspectiveMap.set('your-ingress', 'your-egress');
  changePerspectiveMap.set('your-answer', 'your-question');
  changePerspectiveMap.set('your-question', 'your-answer');

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

  function createIncomingWireMessageObj(otherMachineName, youToMeSlot) {
    return {
      otherMachineName,
      youToMeSlot, // could be a your-ingress, your-egress, your-question, or your-answer
    };
  }

  function createOutgoingWireMessageObj(otherMachineName, meToYouSlot) {
    return {
      otherMachineName,
      meToYouSlot, // could be a your-ingress, your-egress, your-question, or your-answer
    };
  }

  // takes youToMeSlot, returns kernelToMeSlot
  function mapIncomingWireMessageToKernelSlot(otherMachineName, youToMeSlot) {
    return state.get(
      JSON.stringify(
        createIncomingWireMessageObj(otherMachineName, youToMeSlot),
      ),
    );
  }

  // takes kernelToMeSlot, returns meToYouSlot and machineName
  // we don't know the otherMachineName
  function mapKernelSlotToOutgoingWireMessage(kernelToMeSlot) {
    return state.get(JSON.stringify(kernelToMeSlot));
  }

  // kernelToMeSlot can have type: import, export or promise
  // youToMe and meToYou slots can have type: your-ingress,
  // your-egress, your-question, your-answer

  // right, egress, {type:import,id:10}, {type:your-egress, id:7},
  // {type:your-ingress, id:7}

  // we will use this in the following ways:
  // 1) to send out information about something that we know as a
  //    kernelToMeSlot - we will need to allocate an id if it doesn't
  //    already exist and then get the 'meToYouSlot' to send over the
  //    wire
  // 2) to translate something that we get over the wire (youToMeSlot)
  //    into a kernelToMeSlot.
  function add(otherMachineName, kernelToMeSlot, youToMeSlot, meToYouSlot) {
    const incomingWireMessageObj = createIncomingWireMessageObj(
      otherMachineName,
      youToMeSlot,
    );
    const outgoingWireMessageObj = createOutgoingWireMessageObj(
      otherMachineName,
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

  return {
    mapIncomingWireMessageToKernelSlot,
    mapKernelSlotToOutgoingWireMessage,
    changePerspective,
    add,
    dump() {
      return state;
    },
  };
}
