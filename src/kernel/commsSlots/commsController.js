const UNDEFINED = JSON.stringify({ '@qclass': 'undefined' });

export default function handleCommsController(
  state,
  syscall,
  method,
  argsbytes,
  slots,
  resolverID,
  helpers,
  inboundHandlerFacetID,
) {
  function init([vattp]) {
    if (state.machineState.getVatTP()) {
      throw new Error('commsVat has already been initialized');
    }

    // remember the vatTP helper so we can send messages later
    state.machineState.setVatTP(vattp);

    // Create a handler object, and register it with vatTP. After
    // registration, each time a message arrives for our machine, vatTP will
    // invoke the handler like: handler.inbound(senderName, message)
    const handlerExport = { type: 'export', id: inboundHandlerFacetID };
    const regArgs = JSON.stringify({
      args: [{ '@qclass': 'slot', index: 0 }],
    });
    syscall.send(vattp, 'registerCommsHandler', regArgs, [handlerExport]);

    syscall.fulfillToData(resolverID, UNDEFINED, []);
  }

  // an egress is something on my machine that I make available to
  // another machine
  function addEgress([sender, index, valslot]) {
    helpers.log(
      `addEgress called with sender ${sender}, index ${index}, valslot ${valslot}`,
    );
    if (
      Object(valslot) !== valslot ||
      !('@qclass' in valslot) ||
      valslot['@qclass'] !== 'slot'
    ) {
      throw new Error(`value must be a slot, not ${JSON.stringify(valslot)}`);
    }
    const kernelToMeSlot = slots[valslot.index];
    const meToYouSlot = {
      type: 'your-ingress',
      id: index,
    };

    const youToMeSlot = state.clists.changePerspective(meToYouSlot);

    state.clists.add(sender, kernelToMeSlot, youToMeSlot, meToYouSlot);
    syscall.fulfillToData(resolverID, UNDEFINED, []);
  }

  // an ingress is something that lives on another machine
  // this function should only be used for bootstrapping as a shortcut
  // in addIngress, we know the common index that we want to
  // use to communicate about something on the right machine,
  // but the leftcomms needs to export it to the kernel
  function addIngress([otherMachineName, index]) {
    helpers.log(
      `addIngress called with machineName ${otherMachineName}, index ${index}`,
    );

    const youToMeSlot = {
      type: 'your-ingress',
      id: index,
    };

    // if we have already imported this, return the same id
    let kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
      otherMachineName,
      youToMeSlot,
    );

    if (kernelToMeSlot === undefined) {
      const id = state.ids.allocateID();

      kernelToMeSlot = {
        type: 'export', // this is an ingress that we are exporting to the kernel
        id,
      };

      const meToYouSlot = state.clists.changePerspective(youToMeSlot);

      state.clists.add(
        otherMachineName,
        kernelToMeSlot,
        youToMeSlot,
        meToYouSlot,
      );
    }

    // notify the kernel that this call has resolved
    syscall.fulfillToPresence(resolverID, kernelToMeSlot);
  }

  // This is a degenerate form of deserialization, just enough to handle the
  // handful of methods implemented by the commsController. 'argsbytes' can
  // normally have arbitrary {'@qclass':'slot', index} objects, which point
  // into the 'slots' array. The only method that expects one is init(), and
  // it always expects it in args[2], so we manually translate it here.
  const { args } = JSON.parse(argsbytes);

  // translate args that are slots to the slot rather than qclass

  switch (method) {
    case 'init':
      if (args[0]['@qclass'] !== 'slot' || args[0].index !== 0) {
        throw new Error(`unexpected args for init(): ${argsbytes}`);
      }
      args[0] = slots[args[0].index];
      return init(args);
    case 'addEgress':
      return addEgress(args);
    case 'addIngress':
      return addIngress(args);
    default:
      throw new Error(`method ${method} is not available`);
  }
}
