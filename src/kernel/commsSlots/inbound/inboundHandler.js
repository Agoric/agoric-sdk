import makeMapInbound from './mapInbound';

function parseJSON(data) {
  try {
    const d = JSON.parse(data);
    return d;
  } catch (e) {
    console.log(`unparseable data: ${data}`);
    throw e;
  }
}

export default function makeInboundHandler(state, syscall) {
  const enableSIDebug = true;
  function sidebug(...args) {
    if (enableSIDebug) {
      console.log(...args);
    }
  }

  return {
    /**
     * aka 'inbound' from SwingSet-Cosmos
     * @param  {string} senderID public key?
     * @param  {string} dataStr JSON, such as:
     * {
     *  index: 0,
     *  methodName: 'getIssuer',
     *  args: [],
     *  resultIndex: 1,
     * }
     *
     */
    inboundHandler(method, argsStr, deviceToMeSlots) {
      if (method !== 'inbound') {
        throw new Error(`inboundHandler got method '${method}', not 'inbound'`);
      }
      if (deviceToMeSlots.length !== 0) {
        throw new Error(
          `inboundHandler got unexpected slots, ${JSON.stringify(
            deviceToMeSlots,
          )}`,
        );
      }
      const [senderID, dataStr] = JSON.parse(argsStr).args;
      sidebug(`sendIn ${senderID} => ${dataStr}`);

      const {
        mapInboundTarget,
        mapInboundSlot,
        mapInboundResolver,
      } = makeMapInbound(syscall, state, senderID);
      const data = parseJSON(dataStr);

      // everything that comes in to us as a target or a slot needs to
      // get mapped to a kernel slot. If we don't already have a kernel slot for
      // something, it is either an error or we should allocate it.

      // there are four potential events which map onto the syscalls
      // * send
      // * fulfillToData
      // * fulfillToPresence
      // * reject

      // the syscall interfaces are:
      // * syscall.send(kernelToMeTarget, methodName, argsString, kernelToMeSlots) ->
      //   resultPromiseID
      // * syscall.fulfillToData(resolverID, resultString,
      //   kernelToMeSlots)
      // * syscall.fulfillToPresence(resolverID, kernelToMeSlot)
      // * syscall.reject(resolverID, resultString, kernelToMeSlots)

      switch (data.event) {
        case 'send': {
          // build the arguments to syscall.send()
          const kernelToMeTarget = mapInboundTarget(data.target);
          const { methodName } = data;

          const kernelToMeSlots = data.slots.map(mapInboundSlot);

          // put the target.methodName(args, slots) call on the runQueue to
          // be delivered
          const promiseID = syscall.send(
            kernelToMeTarget,
            methodName,
            JSON.stringify({ args: data.args }),
            kernelToMeSlots,
          );

          // if there is a resultIndex passed in, the inbound sender wants
          // to know about the result, so we need to store this in clist for
          // the sender to have future access to

          // in the sendOnly case, no resultSlot should be passed

          if (data.resultSlot) {
            const kernelToMeSlot = {
              type: 'promise',
              id: promiseID,
            };

            // We don't need to create a promise because the result of
            // syscall.send() is a promiseID already.

            const youToMeSlot = data.resultSlot;
            const meToYouSlot = state.clists.changePerspective(youToMeSlot);
            state.clists.add(
              senderID,
              kernelToMeSlot,
              youToMeSlot,
              meToYouSlot,
            );
            syscall.subscribe(promiseID);
          }
          break;
        }
        case 'fulfillToData': {
          const resolverKernelToMeSlot = mapInboundResolver(data.promise);
          const kernelToMeSlots = data.slots.map(mapInboundSlot);

          syscall.fulfillToData(
            resolverKernelToMeSlot.id,
            data.args,
            kernelToMeSlots,
          );
          return;
        }
        case 'fulfillToPresence': {
          const resolverKernelToMeSlot = mapInboundResolver(data.promise);
          const kernelToMeTarget = mapInboundSlot(data.target);

          syscall.fulfillToPresence(
            resolverKernelToMeSlot.id,
            kernelToMeTarget,
          );
          return;
        }
        case 'reject': {
          const resolverKernelToMeSlot = mapInboundResolver(data.promise);
          const kernelToMeSlots = data.slots.map(mapInboundSlot);

          syscall.reject(resolverKernelToMeSlot.id, data.args, kernelToMeSlots);
          return;
        }
        default:
          throw new Error(`unknown event ${data.event}`);
      }
    },
  };
}
