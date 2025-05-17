import { Nat } from '@endo/nat';
import { assert, Fail } from '@endo/errors';
import { kser, kunser, kslot, krefOf } from '@agoric/kmarshal';

// deliverToController() is used for local vats which want to talk to us as a
// vat, rather than as a conduit to talk to remote vats. The bootstrap
// function can use this to invoke our addRemote() and connect us with a
// transport layer (the 'vattp' vat). This is a little awkward, because we
// need the demarshalling and promise-resolution tooling that liveSlots.js
// usually provides, but we avoid liveSlots here because the dominant use
// case (deliverFromRemote and deliverToRemote) don't need it. So we have to
// reconstruct a little of it manually.

export function deliverToController(
  state,
  clistKit,
  methargs,
  result,
  syscall,
) {
  const {
    addEgress,
    addIngress,
    provideKernelForLocal,
    provideLocalForKernel,
  } = clistKit;

  const methargsdata = kunser(methargs);
  const [method, args] = methargsdata;

  function doAddRemote() {
    // comms!addRemote(name, tx, setRx)
    //  we then do setRx!setReceiver(rx)

    const name = args[0];
    const transmitterID = krefOf(args[1]);
    assert(transmitterID, 'bad "transmitter" arg for addRemote()');
    const setReceiverID = krefOf(args[2]);
    assert(setReceiverID, 'bad "setReceiver" arg for addRemote()');

    const { receiverID } = state.addRemote(name, transmitterID);

    const setReceiverMethargs = kser(['setReceiver', [kslot(receiverID)]]);
    syscall.send(setReceiverID, setReceiverMethargs);
    // todo: consider, this leaves one message (setReceiver) on the queue,
    // rather than giving the caller of comms!addRemote() something to
    // synchronize upon. I don't think it hurts, but might affect debugging.
    syscall.resolve([[result, false, kser(undefined)]]);
  }

  function doAddEgress() {
    // comms!addEgress(name, index, obj)

    const remoteName = args[0];
    const remoteID = state.getRemoteIDForName(remoteName);
    remoteID || Fail`unknown remote name ${remoteName}`;
    const remoteRefID = args[1];
    const kernelRefID = krefOf(args[2]);
    assert(kernelRefID, 'bad "obj0" arg for addEgress()');
    const localRef = provideLocalForKernel(kernelRefID);
    addEgress(remoteID, remoteRefID, localRef);
    syscall.resolve([[result, false, kser(undefined)]]);
  }

  function doAddIngress() {
    // obj = comms!addIngress(name, index)

    const remoteName = args[0];
    const remoteID = state.getRemoteIDForName(remoteName);
    remoteID || Fail`unknown remote name ${remoteName}`;
    const remoteRefID = Nat(args[1]);
    const iface = args[2];
    if (iface) {
      assert.typeof(iface, 'string', 'unexpected iface type in addIngress()');
    }
    const localRef = addIngress(remoteID, remoteRefID);
    const data = kser(kslot(provideKernelForLocal(localRef), iface));
    syscall.resolve([[result, false, data]]);
  }

  switch (method) {
    case 'addRemote': {
      return doAddRemote();
    }
    case 'addEgress': {
      return doAddEgress();
    }
    case 'addIngress': {
      return doAddIngress();
    }
    default: {
      throw Fail`method ${method} is not available`;
    }
  }
}
