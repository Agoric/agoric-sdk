import Nat from '@agoric/nat';
import { addRemote } from './remote';
import { addEgress, addIngress } from './clist';
import { insist } from '../../kernel/insist';

const UNDEFINED = JSON.stringify({ '@qclass': 'undefined' });

// deliverToController() is used for local vats which want to talk to us as a
// vat, rather than as a conduit to talk to remote vats. The bootstrap
// function can use this to invoid our addRemote() and connect us with a
// transport layer (the 'vattp' vat). This is a little awkward, because we
// need the demarshalling and promise-resolution tooling that liveSlots.js
// usually provides, but we avoid liveSlots here because the dominant use
// case (deliverFromRemote and deliverToRemote) don't need it. So we have to
// reconstruct a little of it manually.

export function deliverToController(
  state,
  method,
  data,
  slots,
  resolverID,
  syscall,
) {
  function doAddRemote(args) {
    const name = args[0];
    insist(name === `${name}`, `bad addRemote name ${name}`);
    if (args[1]['@qclass'] !== 'slot' || args[1].index !== 0) {
      throw new Error(`unexpected args for addRemote(): ${data}`);
    }
    const transmitterID = slots[args[1].index];
    const { receiverID } = addRemote(state, name, transmitterID);
    syscall.fulfillToPresence(resolverID, receiverID);
  }

  function doAddEgress(args) {
    const remoteName = args[0];
    insist(state.names.has(remoteName), `unknown remote name ${remoteName}`);
    const remoteID = state.names.get(remoteName);
    const remoteRefID = Nat(args[1]);
    if (args[2]['@qclass'] !== 'slot' || args[2].index !== 0) {
      throw new Error(`unexpected args for addEgress(): ${data}`);
    }
    const localRef = slots[args[2].index];
    addEgress(state, remoteID, remoteRefID, localRef);
    syscall.fulfillToData(resolverID, UNDEFINED, []);
  }

  function doAddIngress(args) {
    const remoteName = args[0];
    insist(state.names.has(remoteName), `unknown remote name ${remoteName}`);
    const remoteID = state.names.get(remoteName);
    const remoteRefID = Nat(args[1]);
    const localRef = addIngress(state, remoteID, remoteRefID);
    syscall.fulfillToPresence(resolverID, localRef);
  }

  // This is a degenerate form of deserialization, just enough to handle the
  // handful of methods implemented by the commsController. 'argsbytes' can
  // normally have arbitrary {'@qclass':'slot', index} objects, which point
  // into the 'slots' array. The only method that expects one is init(), and
  // it always expects it in args[2], so we manually translate it here.
  const { args } = JSON.parse(data);

  // translate args that are slots to the slot rather than qclass

  switch (method) {
    case 'addRemote':
      return doAddRemote(args);
    case 'addEgress':
      return doAddEgress(args);
    case 'addIngress':
      return doAddIngress(args);
    default:
      throw new Error(`method ${method} is not available`);
  }
}
