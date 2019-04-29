// access to the outside world
import { makeSendIn } from './makeSendIn';

export default function handleBootstrap(
  state,
  syscall,
  method,
  argsbytes,
  caps,
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

  function addExport([sender, index, valslot]) {
    helpers.log(`addExport called with sender ${sender}, index ${index}`);
    if (
      typeof valslot !== 'object' ||
      !('@qclass' in valslot) ||
      valslot['@qclass'] !== 'slot'
    ) {
      throw new Error(`value must be a slot, not ${JSON.stringify(valslot)}`);
    }
    const val = caps[valslot.index];

    state.clists.add('outbound', sender, index, val);
    syscall.fulfillToData(resolverID, JSON.stringify('undefined'), []);
  }

  function addImport([machineName, index]) {
    helpers.log(
      `addImport called with machineName ${machineName}, index ${index}`,
    );
    // if we have already imported this, return the same id
    let id = state.clists.getKernelExport('inbound', machineName, index);

    // otherwise, create the id and store it
    if (id === undefined) {
      id = state.ids.getNextImportID();
      state.clists.add('inbound', machineName, index, id);
    }

    syscall.fulfillToTarget(resolverID, {
      type: 'export',
      id,
    });
  }

  const { args } = JSON.parse(argsbytes);

  switch (method) {
    case 'init':
      return init(args);
    case 'addExport':
      return addExport(args);
    case 'connect':
      return connect(args);
    case 'addImport':
      return addImport(args);
    default:
      throw new Error(`method ${method} is not available`);
  }
}
