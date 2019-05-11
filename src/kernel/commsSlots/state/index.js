import { makeCLists } from './makeCLists';
import { makeChannels } from './makeChannels';
import { makeAllocateID } from './makeAllocateID';
import { makeMachineState } from './makeMachineState';

function makeState(name) {
  const vatName = name;
  const machineState = makeMachineState();
  const clists = makeCLists();
  const channels = makeChannels();
  const ids = makeAllocateID();

  function dumpState() {
    console.log('STATE', {
      machineState: machineState.dump(),
      clists: clists.dump(),
      channels: channels.dump(),
      nextID: ids.dump(),
      vatName,
    });
  }

  return {
    clists,
    channels,
    ids,
    machineState,
    dumpState,
    vatName,
  };
}

export default makeState;
