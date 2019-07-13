function makeMapOutbound(syscall, state) {
  function mapOutbound(otherMachineName, kernelToMeSlot) {
    const outgoingWireMessageObj = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
      otherMachineName,
    ); //  otherMachineName, direction, meToYouSlot
    if (outgoingWireMessageObj === undefined) {
      // this is something that we have on this machine, and we want
      // to tell another machine about it.
      // OR we have an error

      let meToYouSlot;

      switch (kernelToMeSlot.type) {
        case 'export': {
          throw new Error(
            'we do not expect an export (something we have given to the kernel) if outgoingWireMessageObj is undefined',
          );
        }
        case 'import': {
          const type = 'your-ingress';
          const id = state.ids.allocateID();
          meToYouSlot = {
            type,
            id,
          };
          break;
        }
        case 'promise': {
          // kernel gives a promise, that means that we want to
          // subscribe to it and notify the other side when it
          // settles.

          // we will need to create a new ID to tell the other side about.

          // the promise in an argument is always sent as a promise,
          // even if it resolves to a presence

          const type = 'your-promise';
          const id = state.ids.allocateID();
          meToYouSlot = {
            type,
            id,
          };

          // when we send this as a slot, we also need to subscribe
          // such that we can pass on all of the notifications of the
          // promise settlement
          syscall.subscribe(kernelToMeSlot.id);

          break;
        }
        default: {
          throw new Error('unexpected kernelToMeSlot.type');
        }
      }

      const youToMeSlot = state.clists.changePerspective(meToYouSlot);
      state.clists.add(
        otherMachineName,
        kernelToMeSlot,
        youToMeSlot,
        meToYouSlot,
      );
    }
    const outgoingWireMessage = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
      otherMachineName,
    );
    return outgoingWireMessage.meToYouSlot;
  }

  function mapOutboundTarget(kernelToMeSlot) {
    const outgoingWireMessageList = state.clists.mapKernelSlotToOutgoingWireMessageList(
      kernelToMeSlot,
    ); //  otherMachineName, direction, meToYouSlot
    // we will need to know what machine to send it to, just from the
    // kernel slot

    // we also do not allocate a new id, if we can't find it, it's an
    // error.
    if (!outgoingWireMessageList) {
      throw new Error(
        `targetSlot ${JSON.stringify(kernelToMeSlot)} is not recognized`,
      );
    }
    return outgoingWireMessageList;
  }

  function mapResultSlot(otherMachineName, kernelToMeSlot) {
    // kernel gives us a resolver
    // this is the resultIndex/resultSlot case

    // that means that the kernel is asking the commsVat to send
    // a message on, and has asked to be notified when it resolves.

    // when we talk about this over the wire, this will be
    // 'your-resolver' in meToYou language, and 'your-promise' in
    // youToMe language

    const meToYouSlot = {
      type: 'your-resolver',
      id: state.ids.allocateID(),
    };

    const youToMeSlot = state.clists.changePerspective(meToYouSlot);
    state.clists.add(
      otherMachineName,
      kernelToMeSlot,
      youToMeSlot,
      meToYouSlot,
    );

    const outgoingWireMessage = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
      otherMachineName,
    );
    return outgoingWireMessage.meToYouSlot;
  }

  return {
    mapOutbound,
    mapOutboundTarget,
    mapResultSlot,
  };
}

export default makeMapOutbound;
