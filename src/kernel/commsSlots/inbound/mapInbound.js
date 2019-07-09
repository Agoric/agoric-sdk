function makeMapInbound(syscall, state, senderID) {
  function mapInboundTarget(youToMeSlot) {
    const kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
      senderID,
      youToMeSlot,
    );
    if (kernelToMeSlot === undefined) {
      throw new Error(
        `unrecognized inbound egress target ${JSON.stringify(youToMeSlot)}`,
      );
    }
    return kernelToMeSlot;
  }

  function mapInboundSlot(youToMeSlot) {
    let kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
      senderID,
      youToMeSlot,
    );

    if (kernelToMeSlot === undefined) {
      // we are telling the kernel about something that exists on
      // another machine, that it doesn't know about yet

      switch (youToMeSlot.type) {
        // an object that lives on the other machine
        case 'your-ingress': {
          const exportID = state.ids.allocateID();
          kernelToMeSlot = { type: 'export', id: exportID };
          break;
        }
        // the right to resolve, the decider right is with the other machine
        case 'your-promise': {
          const pr = syscall.createPromise();

          // we need to keep references to both the promise and
          // resolver
          // we use the promise when we talk to the kernel in terms of
          // slots
          // we use the resolver when we tell the kernel to resolve
          // the promise (reject, fulfill, ...)

          kernelToMeSlot = { type: 'promise', id: pr.promiseID };
          state.promiseResolverPairs.add(
            { type: 'promise', id: pr.promiseID },
            { type: 'resolver', id: pr.resolverID },
          );

          // do not subscribe to the promise since all settlement
          // messages should be coming in from other machines
          break;
        }

        default:
          throw new Error(`youToMeSlot.type ${youToMeSlot.type} is unexpected`);
      }

      state.clists.add(
        senderID,
        kernelToMeSlot,
        youToMeSlot,
        state.clists.changePerspective(youToMeSlot),
      );
    }
    return state.clists.mapIncomingWireMessageToKernelSlot(
      senderID,
      youToMeSlot,
    );
  }

  function mapInboundResolver(youToMeSlot) {
    // we store the promise in the clist, but we need to get the resolver
    const kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
      senderID,
      youToMeSlot,
    );

    if (kernelToMeSlot.type === 'resolver') {
      return kernelToMeSlot;
    }
    return state.promiseResolverPairs.getResolver(kernelToMeSlot);
  }

  return {
    mapInboundTarget,
    mapInboundSlot,
    mapInboundResolver,
  };
}

export default makeMapInbound;
