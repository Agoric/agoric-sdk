import { parseJSON } from './helpers';

// TODO: implement verify
function verify(_senderID) {
  return true;
}

export function makeSendIn(state, syscall) {
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

    sendIn(senderID, dataStr) {

      if (!verify(senderID)) {
        throw new Error('could not verify SenderID');
      }

      // "{"index":0,"methodName":"encourageMe","args":["user"],"slots":[],"resultIndex":33}"
      // "{"event":"notifyFulfillToData","resolverID":33,"data":"\"user, you are awesome, keep it up!\""}"

      const data = parseJSON(dataStr);

      // everything that comes in to us as a target or a slot needs to
      // get mapped to a kernel slot. If we don't already have a kernel slot for
      // something, we should allocate it.

      function mapInbound(youToMeSlot) {
        let kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
          senderID,
          'ingress',
          youToMeSlot,
        );
        if (kernelToMeSlot === undefined) {
          const id = state.ids.allocateID();
          // we are telling the kernel about something that exists on another machine
          kernelToMeSlot = {
            type: 'export',
            id,
          };
          state.clists.add(
            senderID,
            'ingress',
            kernelToMeSlot,
            youToMeSlot,
            state.clists.changePerspective(youToMeSlot),
          );
        }
        return state.clists.mapIncomingWireMessageToKernelSlot(
          senderID,
          'ingress',
          youToMeSlot,
        );
      }

      // if not an event, then we are going to be calling something on
      // an object that we know about (is this right?)

      // get the target (an object representing a promise or a vat
      // object) from the index in the data


      let kernelToMeSlots;
      let kernelToMeTarget;
      if (data.slots) {
        kernelToMeSlots = data.slots.map(mapInbound);
      }
      if (data.target) {
        kernelToMeTarget = state.clists.mapIncomingWireMessageToKernelSlot(
          senderID,
          state.clists.getDirectionFromWireMessageSlot(data.target),
          data.target,
        );
      }

      if (data.event) {
        switch (data.event) {
          case 'notifyFulfillToData':
            syscall.fulfillToData(data.resolverID, data.args, kernelToMeSlots);
            return;
          case 'notifyFulfillToTarget':
            syscall.fulfillToTarget(data.promiseID, kernelToMeTarget);
            return;
          case 'notifyReject':
            syscall.notifyReject(data.promiseID, data.args, kernelToMeSlots);
            return;
          default:
            throw new Error(`unknown event ${data.event}`);
        }
      }

      /* slots are used when referencing a
        presence as an arg, e.g.:
        {
          index: 2,
          methodName: 'deposit',
          args: [20, { '@qclass': 'slot', index: 0 }],
          slots: [{ type: 'export', index: 0 }],
          resultIndex: 3,
        }
      */

      // put the target.methodName(args, slots) call on the runQueue to
      // be delivered
      const promiseID = syscall.send(
        kernelToMeTarget,
        data.methodName,
        JSON.stringify({ args: data.args }),
        kernelToMeSlots,
      );

      // if there is a resultIndex passed in, the inbound sender wants
      // to know about the result, so we need to store this in clist for
      // the sender to have future access to

      if (data.resultIndex) {
        const kernelToMeSlot = {
          type: 'promise',
          id: promiseID,
        };
        const youToMeSlot = {
          type: 'your-ingress',
          id: data.resultIndex,
        };
        const meToYouSlot = state.clists.changePerspective(youToMeSlot);
        state.clists.add(
          senderID,
          'egress',
          kernelToMeSlot,
          youToMeSlot,
          meToYouSlot,
        );
        syscall.subscribe(promiseID);
      }
    },
  };
}
