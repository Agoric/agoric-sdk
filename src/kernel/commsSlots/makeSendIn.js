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

      if (data.event === 'notifyFulfillToData') {
        syscall.fulfillToData(data.resolverID, data.data, []);
        return;
      }

      // get the target (an object representing a promise or a vat
      // object) from the index in the data
      const targetObject = state.clists.getKernelExport(
        'outbound',
        senderID,
        data.index,
      );

      /* slots are only in use by ag-cosmos-client.js when referencing a
        presence as an arg, e.g.:
        {
          index: 2,
          methodName: 'deposit',
          args: [20, { '@qclass': 'slot', index: 0 }],
          slots: [{ type: 'export', index: 0 }],
          resultIndex: 3,
        }
      */

      // e.g.: slots: [{ type: 'export', index: 0 }],
      // translate an external slot description to the commsVat's
      // perspective?
      // .e.g { index: 0, type: 'export' } ->  { type: 'import', id: 10 }
      function translateSlotsArray(slotsArray) {
        function isObjectAndTypeIsExport(externalSlot) {
          if (
            typeof externalSlot !== 'object' ||
            externalSlot.type !== 'export'
          ) {
            throw new Error(
              `extSlot must currently be type:export, not ${JSON.stringify(
                externalSlot,
              )}`,
            );
          }
        }

        function translateSlot(externalSlot) {
          isObjectAndTypeIsExport(externalSlot);
          return state.clists.getKernelExport(
            'outbound',
            senderID,
            externalSlot.index,
          );
        }
        return slotsArray.map(translateSlot);
      }
      let slots = [];
      if (data.slots) {
        slots = translateSlotsArray(data.slots);
      }

      // put the target.methodName(args, slots) call on the runQueue to
      // be delivered
      const promiseID = syscall.send(
        targetObject,
        data.methodName,
        JSON.stringify({ args: data.args }),
        slots,
      );

      // if there is a resultIndex passed in, the inbound sender wants
      // to know about the result, so we need to store this in clist for
      // the sender to have future access to

      if (data.resultIndex) {
        state.clists.add('outbound', senderID, data.resultIndex, {
          type: 'promise',
          id: promiseID,
        });
        state.subscribers.add(promiseID, senderID);
        syscall.subscribe(promiseID);
      }
    },
  };
}
