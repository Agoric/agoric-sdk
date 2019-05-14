function makeMapInbound(syscall, state, senderID) {
  function mapInbound(youToMeSlot) {
    let kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
      senderID,
      youToMeSlot,
    );
    if (kernelToMeSlot === undefined) {
      // we are telling the kernel about something that exists on
      // another machine, these are ingresses

      switch (youToMeSlot.type) {
        case 'your-ingress': {
          const exportID = state.ids.allocateID();
          kernelToMeSlot = { type: 'export', id: exportID };
          break;
        }
        case 'your-promise': {
          const pr = syscall.createPromise();

          // we are creating a promise chain, send our new promiseID
          kernelToMeSlot = { type: 'promise', id: pr.promiseID };
          state.promiseResolverPairs.add(
            { type: 'promise', id: pr.promiseID },
            { type: 'resolver', id: pr.resolverID },
          );

          // I don't think it makes sense to subscribe to the promise,
          // since all settlement messages should be coming in from
          // other machines
          break;
        }
        case 'your-resolver': {
          // this is resultSlot case, where this is how the
          // otherMachine is requesting to be notified about the
          // result of a message

          const pr = syscall.createPromise();
          state.promiseResolverPairs.add(
            { type: 'promise', id: pr.promiseID },
            { type: 'resolver', id: pr.resolverID },
          );

          // we are creating a promise chain
          kernelToMeSlot = { type: 'promise', id: pr.promiseID };

          syscall.subscribe(kernelToMeSlot);
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

  return mapInbound;
}

export default makeMapInbound;
