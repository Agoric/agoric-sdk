function makeMapOutbound(syscall, state) {
  function mapOutbound(otherMachineName, kernelToMeSlot) {
    const outgoingWireMessageObj = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
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
          // kernel gives a promise
          // that means that when we create a new promise/resolver
          // pair, we will be sending on the promise ID and mapping it
          // to our kernel promise

          // we can't drop the new resolver, because this is what
          // liveslots wants when we do syscall.fulfillToTarget(),
          // etc.

          // when we talk about this over the wire, this will be
          // 'your-question' in meToYou language, and 'your-answer' in
          // youToMe language

          // the promise in an argument is always sent as a promise,
          // even if it resolves to a presence

          // we need a way to store the promise, and send a
          // notification to the other side when it is resolved or rejected
          const pr = syscall.createPromise();

          // we are creating a promise chain, send our new promiseID
          meToYouSlot = { type: 'your-question', id: pr.promiseID };

          // store the resolver so we can retrieve it later
          state.resolvers.add(
            { type: 'promise', id: pr.promiseID },
            { type: 'resolver', id: pr.resolverID },
          );

          // when we send this as a slot, we also need to subscribe
          // such that we can pass on all of the notifications of the
          // promise settlement
          syscall.subscribe(pr.promiseID);
          syscall.subscribe(kernelToMeSlot.id);

          break;
        }
        case 'resolver': {
          // kernel gives us a resolver
          // that means that when we create a new promise/resolver
          // pair, we will be sending on the resolverID and mapping it
          // to our kernel resolver

          // when we talk about this over the wire, this will be
          // 'your-answer' in meToYou language, and 'your-question' in
          // youToMe language

          // we need a way to store the resolver, and resolve or
          // reject it when we get a notification to do so from
          // the other side.
          const pr = syscall.createPromise();

          // store the resolver so we can retrieve it later
          state.resolvers.add(
            { type: 'promise', id: pr.promiseID },
            { type: 'resolver', id: pr.resolverID },
          );

          // we are creating a promise chain, send our resolverID
          meToYouSlot = { type: 'your-answer', id: pr.resolverID };

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
    );
    return outgoingWireMessage.meToYouSlot;
  }

  function mapOutboundTarget(kernelToMeSlot) {
    const outgoingWireMessageObj = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
    ); //  otherMachineName, direction, meToYouSlot
    // we will need to know what machine to send it to, just from the
    // kernel slot

    // we also do not allocate a new id, if we can't find it, it's an
    // error.
    if (!outgoingWireMessageObj) {
      throw new Error(
        `targetSlot ${JSON.stringify(kernelToMeSlot)} is not recognized`,
      );
    }
    return outgoingWireMessageObj;
  }

  return {
    mapOutbound,
    mapOutboundTarget,
  };
}

export default makeMapOutbound;
