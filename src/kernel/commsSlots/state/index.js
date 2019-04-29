import { makeCLists } from './makeCLists';
import { makeSubscribers } from './makeSubscribers';
import { makeChannels } from './makeChannels';
import { makeGetNextImportID } from './makeGetNextImportID';
import { makeMachineState } from './makeMachineState';

function makeState(name) {
  const vatName = name;
  const machineState = makeMachineState();
  const clists = makeCLists();
  const subscribers = makeSubscribers();
  const channels = makeChannels();
  const ids = makeGetNextImportID();

  function dumpState() {
    console.log('STATE', {
      machineState: machineState.dump(),
      clists: clists.dump(),
      subscribers: subscribers.dump(),
      channels: channels.dump(),
      nextID: ids.dump(),
      vatName,
    });
  }

  return {
    clists,
    subscribers,
    channels,
    ids,
    machineState,
    dumpState,
    vatName,
  };
}

export default makeState;
