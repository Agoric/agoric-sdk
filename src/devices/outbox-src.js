import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function setup(syscall, helpers, endowments) {
  const { addToOutbox, removeFromOutbox, setAcknum } = endowments;

  // we keep no state in the device, it all lives elsewhere, as decided by
  // the host

  function getState() {
    return harden({});
  }

  function setState(_newState) {}

  return helpers.makeDeviceSlots(
    syscall,
    _SO =>
      harden({
        add(recipient, msgnum, body) {
          try {
            addToOutbox(`${recipient}`, Nat(msgnum), `${body}`);
          } catch (e) {
            throw new Error(`error in addToOutbox: ${e} ${e.message}`);
          }
        },
        remove(recipient, msgnum) {
          try {
            removeFromOutbox(`${recipient}`, Nat(msgnum));
          } catch (e) {
            throw new Error(`error in removeFromOutbox: ${e} ${e.message}`);
          }
        },
        ackInbound(recipient, msgnum) {
          try {
            setAcknum(`${recipient}`, Nat(msgnum));
          } catch (e) {
            throw new Error(`error in setInboxAck: ${e} ${e.message}`);
          }
        },
      }),
    getState,
    setState,
    helpers.name,
  );
}
