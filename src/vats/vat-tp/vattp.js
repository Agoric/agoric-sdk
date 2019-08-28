import harden from '@agoric/harden';
import { insist } from '../../kernel/insist';

function build(E, D) {
  let mailbox; // mailbox device
  const remotes = new Map();
  // { outbound: { highestRemoved, highestAdded },
  //   inbound: { highestDelivered, receiver } }

  function getRemote(name) {
    if (!remotes.has(name)) {
      remotes.set(name, {
        outbound: { highestRemoved: 0, highestAdded: 0 },
        inbound: { highestDelivered: 0, receiver: null },
      });
    }
    return remotes.get(name);
  }

  const handler = harden({
    registerMailboxDevice(mailboxDevnode) {
      mailbox = mailboxDevnode;
    },

    addRemote(name) {
      insist(!remotes.has(name), `already have remote ${name}`);
      const r = getRemote(name);
      const transmitter = harden({
        transmit(msg) {
          const o = r.outbound;
          const num = o.highestAdded + 1;
          // console.log(`transmit to ${name}[${num}]: ${msg}`);
          D(mailbox).add(name, num, msg);
          o.highestAdded = num;
        },
      });
      const setReceiver = harden({
        setReceiver(newReceiver) {
          if (r.inbound.receiver) {
            throw new Error(`setReceiver is call-once`);
          }
          r.inbound.receiver = newReceiver;
        },
      });
      return harden({ transmitter, setReceiver });
    },

    deliverInboundMessages(name, newMessages) {
      const i = getRemote(name).inbound;
      newMessages.forEach(m => {
        const [num, body] = m;
        if (num > i.highestDelivered) {
          // TODO: SO() / sendOnly()
          // console.log(`receive from ${name}[${num}]: ${body}`);
          E(i.receiver).receive(body);
          i.highestDelivered = num;
          D(mailbox).ackInbound(name, num);
        }
      });
    },

    deliverInboundAck(name, ack) {
      const o = getRemote(name).outbound;
      let num = o.highestRemoved + 1;
      while (num <= o.highestAdded && num <= ack) {
        D(mailbox).remove(name, num);
        o.highestRemoved = num;
        num += 1;
      }
    },
  });

  return handler;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
