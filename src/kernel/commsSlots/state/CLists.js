/**
 * MakeCLists Module
 * This module is instantiated per CommsVat and stores data about
 * mappings between external machines and slots.
 *
 * a clist maps a local machine kernel slot to what will be sent over the wire
 *
 * @module makeCLists
 */

export function makeCLists() {
  const state = new Map();

  function checkIfAlreadyExists(incomingWireMessageKey, kernelToMeKey) {
    const slot = state.get(incomingWireMessageKey);
    const outgoing = state.get(kernelToMeKey);
    if (slot && outgoing) {
      throw new Error(`${kernelToMeKey} already exists in clist`);
    }
  }

  const changePerspectiveMap = new Map();
  // youToMe: your-egress, meToYou: your-ingress
  // youToMe: your-ingress, meToYou: your-egress
  // youToMe: your-promise, meToYou: your-resolver
  // youToMe: your-resolver, meToYou: your-promise
  changePerspectiveMap.set('your-egress', 'your-ingress');
  changePerspectiveMap.set('your-ingress', 'your-egress');
  changePerspectiveMap.set('your-promise', 'your-resolver');
  changePerspectiveMap.set('your-resolver', 'your-promise');

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

  function createIncomingWireMessageKey(otherMachineName, youToMeSlot) {
    // TODO: we need an encoding scheme that is both stable and
    // collision-free under adversarial attack. Any encoding scheme that can
    // be decoded unambiguously is sufficiently collision-free. This first
    // used JSON.stringify, which is collision-free, but its stability
    // depends upon the order in which the object keys were added. "djson" (a
    // library that provides deterministic JSON encoding) would be stable,
    // but importing it into a SES environment sounds like an adventure. For
    // now, we use a cheap concatenation that is stable but not
    // collision-free. However, 'otherMachineName' will generally be a public
    // key, which won't have hyphens, so the attacker is not likely to be
    // able to force a collision with other machines, which is the only kind
    // of collision that could get them unintended access. See #45 for more.
    return `incoming-${otherMachineName}-${youToMeSlot.type}-${youToMeSlot.id}`;
  }

  function createOutgoingWireMessageObj(otherMachineName, meToYouSlot) {
    return {
      otherMachineName,
      meToYouSlot, // could be a your-ingress, your-egress
    };
  }

  function createKernelToMeKey(kernelToMeSlot) {
    return `kernel-${kernelToMeSlot.type}-${kernelToMeSlot.id}`;
  }

  // takes youToMeSlot, returns kernelToMeSlot
  function mapIncomingWireMessageToKernelSlot(otherMachineName, youToMeSlot) {
    const key = createIncomingWireMessageKey(otherMachineName, youToMeSlot);
    if (!state.has(key)) {
      console.log(`unable to find key ${key}`);
    }
    return state.get(key);
  }

  // takes kernelToMeSlot, returns meToYouSlot and machineName
  // we don't know the otherMachineName
  function mapKernelSlotToOutgoingWireMessageList(kernelToMeSlot) {
    const machineNameToOutgoingWireMessageMap = state.get(
      createKernelToMeKey(kernelToMeSlot),
    );
    return Array.from(machineNameToOutgoingWireMessageMap.values());
  }

  function mapKernelSlotToOutgoingWireMessage(
    kernelToMeSlot,
    otherMachineName,
  ) {
    const machineNameToOutgoingMessageMap = state.get(
      createKernelToMeKey(kernelToMeSlot),
    );
    if (machineNameToOutgoingMessageMap === undefined) {
      return undefined;
    }
    return machineNameToOutgoingMessageMap.get(otherMachineName); // the meToYouSlot for that otherMachineName
  }

  // kernelToMeSlot can have type: import, export or promise
  // youToMe and meToYou slots can have type: your-ingress or
  // your-egress

  // we will use this in the following ways:
  // 1) to send out information about something that we know as a
  //    kernelToMeSlot - we will need to allocate an id if it doesn't
  //    already exist and then get the 'meToYouSlot' to send over the
  //    wire
  // 2) to translate something that we get over the wire (youToMeSlot)
  //    into a kernelToMeSlot.
  function add(otherMachineName, kernelToMeSlot, youToMeSlot, meToYouSlot) {
    const incomingWireMessageKey = createIncomingWireMessageKey(
      otherMachineName,
      youToMeSlot,
    );
    const outgoingWireMessageObj = createOutgoingWireMessageObj(
      otherMachineName,
      meToYouSlot,
    );
    const kernelToMeKey = createKernelToMeKey(kernelToMeSlot);
    checkIfAlreadyExists(incomingWireMessageKey, kernelToMeKey);
    const machineNameToOutgoingMessage = state.get(kernelToMeKey) || new Map();
    machineNameToOutgoingMessage.set(otherMachineName, outgoingWireMessageObj);
    state.set(kernelToMeKey, machineNameToOutgoingMessage);
    state.set(incomingWireMessageKey, kernelToMeSlot);
  }

  return {
    mapIncomingWireMessageToKernelSlot,
    mapKernelSlotToOutgoingWireMessageList,
    mapKernelSlotToOutgoingWireMessage,
    changePerspective,
    add,
    dump() {
      return state;
    },
  };
}
