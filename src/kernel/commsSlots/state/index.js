import { makeCLists } from './CLists';
import { makeChannels } from './channels';
import { makeAllocateID } from './allocateID';
import { makeMachineState } from './machineState';
import { makePromiseResolverPairs } from './promiseResolverPairs';

function makeState(name) {
  const vatName = name;
  const machineState = makeMachineState();
  const clists = makeCLists();
  const channels = makeChannels();
  const ids = makeAllocateID();
  const promiseResolverPairs = makePromiseResolverPairs();

  function dumpState() {
    console.log('STATE', {
      machineState: machineState.dump(),
      clists: clists.dump(),
      channels: channels.dump(),
      nextID: ids.dump(),
      vatName,
      promiseResolverPairs: promiseResolverPairs.dump(),
    });
  }

  return {
    clists,
    channels,
    ids,
    machineState,
    dumpState,
    vatName,
    promiseResolverPairs,
  };
}

export default makeState;
