function makeMapInbound(syscall, state) {
  function mapInbound(senderID, youToMeSlot) {
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
        case 'your-answer': {
          // our "answer" is a resolver, we can find out the
          // answer and notify the other machine using the
          // you-answer id.
          // once started, "answers" are active, "questions" are
          // passive

          // what does it mean if it's a your-answer?
          // what are we resolving such that we can send a message
          // back?

          // maybe this isn't a case that should be possible?
          throw new Error(`we don't expect your-answer here`);
        }
        case 'your-question': {
          // we need to create a new promise and resolver pair
          // we can't drop the resolver

          const pr = syscall.createPromise();

          // we are creating a promise chain, send our new promiseID
          kernelToMeSlot = { type: 'promise', id: pr.promiseID };

          // store the resolver so we can retrieve it later
          state.resolvers.add(kernelToMeSlot, {
            type: 'resolver',
            id: pr.resolverID,
          });
          syscall.subscribe(pr.promiseID);

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
