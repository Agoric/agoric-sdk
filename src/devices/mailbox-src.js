import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function setup(syscall, helpers, endowments) {
  const highestInboundDelivered = harden(new Map());
  const highestInboundAck = harden(new Map());
  let inboundHandler;

  function inboundCallback(hPeer, hMessages, hAck) {
    const peer = `${hPeer}`;
    if (!inboundCallback) {
      throw new Error(
        `mailbox.inboundCallback(${peer}) called before handler was registered`,
      );
    }
    const ack = Nat(hAck);
    let didSomething = false;

    let latestMsg = 0;
    if (highestInboundDelivered.has(peer)) {
      latestMsg = highestInboundDelivered.get(peer);
    }
    const newMessages = [];
    hMessages.forEach(m => {
      const [hNum, hMsg] = m;
      const num = Nat(hNum);
      if (num > latestMsg) {
        newMessages.push([num, `${hMsg}`]);
        latestMsg = num;
        highestInboundDelivered.set(peer, latestMsg);
      }
    });
    if (newMessages.length) {
      inboundHandler.deliverInboundMessages(peer, harden(newMessages));
      didSomething = true;
    }
    let latestAck = 0;
    if (highestInboundAck.has(peer)) {
      latestAck = highestInboundAck.get(peer);
    }
    if (ack > latestAck) {
      highestInboundAck.set(peer, ack);
      inboundHandler.deliverInboundAck(peer, ack);
      didSomething = true;
    }
    return didSomething;
  }
  endowments.registerInboundCallback(inboundCallback);

  // we keep no state in the device, it all lives elsewhere, as decided by
  // the host

  function getState() {
    return harden({});
  }

  function setState(_newState) {}

  return helpers.makeDeviceSlots(
    syscall,
    SO =>
      harden({
        registerInboundHandler(handler) {
          if (inboundHandler) {
            throw new Error(`already registered`);
          }
          inboundHandler = harden({
            deliverInboundMessages(peer, newMessages) {
              try {
                SO(handler).deliverInboundMessages(peer, newMessages);
              } catch (e) {
                console.log(
                  `error during deliverInboundMessages: ${e} ${e.message}`,
                );
              }
            },
            deliverInboundAck(peer, ack) {
              try {
                SO(handler).deliverInboundAck(peer, ack);
              } catch (e) {
                console.log(
                  `error during deliverInboundAck: ${e} ${e.message}`,
                );
              }
            },
          });
        },

        add(peer, msgnum, body) {
          try {
            endowments.add(`${peer}`, Nat(msgnum), `${body}`);
          } catch (e) {
            throw new Error(`error in add: ${e} ${e.message}`);
          }
        },

        remove(peer, msgnum) {
          try {
            endowments.remove(`${peer}`, Nat(msgnum));
          } catch (e) {
            throw new Error(`error in remove: ${e} ${e.message}`);
          }
        },

        ackInbound(peer, msgnum) {
          try {
            endowments.setAcknum(`${peer}`, Nat(msgnum));
          } catch (e) {
            throw new Error(`error in ackInbound: ${e} ${e.message}`);
          }
        },
      }),
    getState,
    setState,
    helpers.name,
  );
}
