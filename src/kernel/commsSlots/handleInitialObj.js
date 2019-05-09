// access to the outside world
import { makeSendIn } from './makeSendIn';

export default function handleInitialObj(
  state,
  syscall,
  method,
  argsbytes,
  slots,
  resolverID,
  helpers,
  devices,
) {
  function init([name, proofMaterial]) {
    helpers.log(`init called with name ${name}`);
    if (
      state.machineState.getMachineName() != null ||
      state.machineState.getProofMaterial() != null
    ) {
      throw new Error('commsVat has already been initialized');
    }

    state.machineState.setMachineName(name);
    state.machineState.setProofMaterial(proofMaterial);

    syscall.fulfillToData(
      resolverID,
      JSON.stringify(state.machineState.getMachineName()),
      [],
    );
  }

  function connect([otherMachineName, _verifyingKey, channelName]) {
    helpers.log(
      `connect called with otherMachineName ${otherMachineName}, channelName ${channelName}`,
    );
    if (channelName !== 'channel') {
      throw new Error('channel not recognized');
    }

    // TODO: check signature on this
    // in the future, data structure would contain name and predicate

    state.channels.add(otherMachineName, channelName);
    const { sendIn } = makeSendIn(state, syscall);

    if (devices && devices[channelName]) {
      devices[channelName].registerInboundCallback(
        state.machineState.getMachineName(),
        sendIn,
      );
    }

    syscall.fulfillToData(resolverID, JSON.stringify('undefined'), []);
  }

  // an egress is something on my machine that I make available to
  // another machine
  function addEgress([sender, index, valslot]) {
    helpers.log(
      `addEgress called with sender ${sender}, index ${index}, valslot ${valslot}`,
    );
    if (
      typeof valslot !== 'object' ||
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
    syscall.fulfillToData(resolverID, JSON.stringify('undefined'), []);
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
    syscall.fulfillToTarget(resolverID, kernelToMeSlot);
  }

  const { args } = JSON.parse(argsbytes);

  // translate args that are slots to the slot rather than qclass

  switch (method) {
    case 'init':
      return init(args);
    case 'addEgress':
      return addEgress(args);
    case 'connect':
      return connect(args);
    case 'addIngress':
      return addIngress(args);
    default:
      throw new Error(`method ${method} is not available`);
  }
}
