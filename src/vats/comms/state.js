export function makeState() {
  const state = {
    nextRemoteIndex: 1,
    remotes: new Map(), // remoteNN -> { remoteID, name, fromRemote/toRemote, etc }
    names: new Map(), // name -> remoteNN

    nextObjectIndex: 10,
    remoteReceivers: new Map(), // o+NN -> remoteNN
    objectTable: new Map(), // o+NN -> owning remote

    // hopefully we can avoid the need for local promises
    // localPromises: new Map(), // p+NN/p-NN -> local purpose
    promiseTable: new Map(), // p+NN/p-NN -> { owner, resolved, decider, subscriber }
    nextPromiseIndex: 20,
  };

  return state; // mutable
}

export function dumpState(state) {
  console.log(`Object Table:`);
  for (const id of state.objectTable.keys()) {
    console.log(`${id} : owner=${state.objectTable.get(id)}`);
  }
  console.log();

  console.log(`Promise Table:`);
  for (const id of state.promiseTable.keys()) {
    const p = state.promiseTable.get(id);
    console.log(
      `${id} : owner=${p.owner}, resolved=${p.resolved}, decider=${p.decider}, sub=${p.subscriber}`,
    );
  }
  console.log();

  for (const remoteID of state.remotes.keys()) {
    const r = state.remotes.get(remoteID);
    console.log(`${remoteID} '${r.name}':`);
    for (const inbound of r.fromRemote.keys()) {
      const id = r.fromRemote.get(inbound);
      const outbound = r.toRemote.get(id);
      console.log(` ${inbound} -> ${id} -> ${outbound}`);
    }
  }
}

export function allocatePromiseIndex(state) {
  const index = state.nextPromiseIndex;
  state.nextPromiseIndex += 1;
  return index;
}
