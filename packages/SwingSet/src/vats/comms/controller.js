import { Nat } from '@agoric/nat';
const { details: X } = assert;

const UNDEFINED = harden({
  body: JSON.stringify({ '@qclass': 'undefined' }),
  slots: [],
});

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

  const methargsdata = JSON.parse(methargs.body);
  const [method, args] = methargsdata;
  const { slots } = methargs;

  // We use a degenerate form of deserialization, just enough to handle the
  // handful of methods implemented by the commsController. 'args.body' can
  // normally have arbitrary {'@qclass': whatever} objects, but we only
  // handle {'@qclass':'slot', index} objects, which point into the
  // 'args.slots' array.

  function doAddRemote() {
    // comms!addRemote(name, tx, setRx)
    //  we then do setRx!setReceiver(rx)

    const name = args[0];
    assert.typeof(name, 'string', X`bad addRemote name ${name}`);
    assert(
      args[1]['@qclass'] === 'slot' && args[1].index === 0,
      X`unexpected args for addRemote(): ${methargs.body}`,
    );
    assert(
      args[2]['@qclass'] === 'slot' && args[2].index === 1,
      X`unexpected args for addRemote(): ${methargs.body}`,
    );
    const transmitterID = slots[args[1].index];
    const setReceiverID = slots[args[2].index];

    const { receiverID } = state.addRemote(name, transmitterID);

    const rxArg = { '@qclass': 'slot', index: 0 };
    const setReceiverMethargs = harden({
      body: JSON.stringify(['setReceiver', [rxArg]]),
      slots: [receiverID],
    });
    syscall.send(setReceiverID, setReceiverMethargs);
    // todo: consider, this leaves one message (setReceiver) on the queue,
    // rather than giving the caller of comms!addRemote() something to
    // synchronize upon. I don't think it hurts, but might affect debugging.
    syscall.resolve([[result, false, UNDEFINED]]);
  }

  function doAddEgress() {
    // comms!addEgress(name, index, obj)

    const remoteName = args[0];
    const remoteID = state.getRemoteIDForName(remoteName);
    assert(remoteID, X`unknown remote name ${remoteName}`);
    const remoteRefID = args[1];
    assert(
      args[2]['@qclass'] === 'slot' && args[2].index === 0,
      X`unexpected args for addEgress(): ${methargs.body}`,
    );
    const localRef = provideLocalForKernel(slots[args[2].index]);
    addEgress(remoteID, remoteRefID, localRef);
    syscall.resolve([[result, false, UNDEFINED]]);
  }

  function doAddIngress() {
    // obj = comms!addIngress(name, index)

    const remoteName = args[0];
    const remoteID = state.getRemoteIDForName(remoteName);
    assert(remoteID, X`unknown remote name ${remoteName}`);
    const remoteRefID = Nat(args[1]);
    const iface = args[2];
    const localRef = addIngress(remoteID, remoteRefID);
    const data = {
      body: '{"@qclass":"slot","index":0}',
      slots: [provideKernelForLocal(localRef)],
    };
    if (iface) {
      data.body = `{"@qclass":"slot","iface":"${iface}","index":0}`;
    }
    syscall.resolve([[result, false, data]]);
  }

  switch (method) {
    case 'addRemote':
      return doAddRemote();
    case 'addEgress':
      return doAddEgress();
    case 'addIngress':
      return doAddIngress();
    default:
      assert.fail(X`method ${method} is not available`);
  }
}
