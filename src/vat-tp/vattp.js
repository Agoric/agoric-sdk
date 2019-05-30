import harden from '@agoric/harden';

function build(E, D) {
  let mailbox; // mailbox device
  // inbound
  let commsHandler;
  // outbound
  const peers = new Map();
  // { outbound: { highestRemoved, highestAdded }, inbound: { highestDelivered } }

  function getPeer(peer) {
    if (!peers.has(peer)) {
      peers.set(peer, {
        outbound: { highestRemoved: 0, highestAdded: 0 },
        inbound: { highestDelivered: 0 },
      });
    }
    return peers.get(peer);
  }

  const handler = harden({
    registerMailboxDevice(mailboxDevnode) {
      mailbox = mailboxDevnode;
    },
    registerCommsHandler(h) {
      commsHandler = h;
    },
    deliverInboundMessages(peer, newMessages) {
      const p = getPeer(peer).inbound;
      newMessages.forEach(m => {
        const [num, body] = m;
        if (num > p.highestDelivered) {
          // TODO: SO() / sendOnly()
          E(commsHandler).inbound(peer, body);
          p.highestDelivered = num;
          D(mailbox).ackInbound(peer, num);
        }
      });
    },

    deliverInboundAck(peer, ack) {
      const p = getPeer(peer).outbound;
      let num = p.highestRemoved + 1;
      while (num <= p.highestAdded && num <= ack) {
        D(mailbox).remove(peer, num);
        p.highestRemoved = num;
        num += 1;
      }
    },

    send(peer, msg) {
      const p = getPeer(peer).outbound;
      const num = p.highestAdded + 1;
      D(mailbox).add(peer, num, msg);
      p.highestAdded = num;
    },
  });

  return handler;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
