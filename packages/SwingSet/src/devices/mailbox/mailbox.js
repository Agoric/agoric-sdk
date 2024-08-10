/*
  The 'mailbox' device helps manage bidirectional communication with a number
  of 'peers'. Each peer is identified with a string. We exchange ordered
  acknowledged messages with each peer, conveyed by a host- and peer-
  specific process. The mailbox device is only made available to a special
  'VatTP' vat, which manages the acknowledgments.

   mailboxDevice <-> vat-VatTP <-> vat-comms <-> vat-target

  In the outbound direction, the mailbox device manages a special section of the
  kernel state vector. For each peer, this 'mailboxState' object contains a list
  of outstanding messages (each with a msgnum integer and a string body), and an
  'ackNum' (an integer which indicates the highest-numbered inbound message that
  has been processed, where '1' is the first message).

  When the comms vat wants to send a message, it sends a 'send()' message to
  the vatTP, as 'send(peer, msg)'. When this arrives on vat-VatTP, it invokes
  the device's 'add' method, as add(peer, msgnum, msg). The add() function
  modifies the mailboxState vector. This all takes place while the kernel run
  loop is processing the run-queue, so no actual messages are transmitted
  yet.

  Later, when the host has finished processing the run-queue (or decides that
  it's done enough work for now, and leaves some items on the queue), the
  host performs the post-loop tasks. The first task is to checkpoint the
  kernel state vector, including mailboxState.

  Then, if the host lives in a solo machine, it must walk through the
  mailboxState and identify any messages or acks which need to be
  transmitted. It keeps track of the highest msgnum that has been transmitted
  in this instance of the host (i.e. when the host restarts, it may
  retransmit older messages). It also keeps track of the highest acknum that
  has been transmitted in this instance. If the current mailboxState contains
  either a higher msgnum or acknum, it must transmit a [messages, acknum]
  pair to the indicated peer.

  If the host lives in a replicated consensus environment (i.e. a
  blockchain), it doesn't need to do anything else. External followers will
  notice that the outbox has changed, and react to it by delivering the new
  messages into the receiving side.

  On the intended recipient, outside of the swingset codebase, something
  becomes aware of the incoming messages and acknum. It submits these (along
  with the name of the sender) to the `deliverInbound()` function. This
  performs deduplication, so it is reasonable to re-invoke `deliverInbound()`
  with the same set of messages multiple times (e.g. if the program is
  following a blockchain, and each new block triggers another call).
  deliverInbound then delivers the new messages to the VatTP vat, which
  forwards them to the comms vat for dispatch to the right target objects.
  VatTP also updates the outbound `acknum` field with the latest message it
  has processed.

  As before (on the other machine), the host must examine the mailboxState
  and notice that the `acknum` has changed, and notify the other side
  somehow. When that notification arrives, `deliverInbound()` is again
  invoked (with the new acknum, but perhaps no new messages). The new acknum
  tells the VatTP on that side that it is now safe to remove the retired
  messages from its own mailboxState.

  Acks must be delivered next to actual messages, not inside them, because
  otherwise the acknowledgment process would never converge. Acks can
  piggyback on top of normal messages, so no extra roundtrips should be
  necessary.

*/

import { Fail } from '@endo/errors';
import { Nat } from '@endo/nat';

// This Map-based mailboxState object is a good starting point, but we may
// replace it with one that tracks which parts of the state have been
// modified, to build more efficient Merkle proofs.

export function importMailbox(data, inout = {}) {
  const outbox = new Map();
  for (const m of data.outbox) {
    outbox.set(Nat(m[0]), m[1]);
  }
  inout.ack = Nat(data.ack);
  inout.outbox = outbox;
  return inout;
}

export function exportMailbox(inout) {
  const messages = [];
  for (const [msgnum, body] of inout.outbox) {
    messages.push([Number(msgnum), body]);
  }
  messages.sort((a, b) => a[0] - b[0]);
  return {
    ack: Number(inout.ack),
    outbox: messages,
  };
}

export function buildMailboxStateMap(state = harden(new Map())) {
  function getOrCreatePeer(peer) {
    if (!state.has(peer)) {
      const inout = {
        outbox: harden(new Map()),
        ack: 0n,
      };
      state.set(peer, inout);
    }
    return state.get(peer);
  }

  function add(peer, msgnum, body) {
    getOrCreatePeer(`${peer}`).outbox.set(Nat(msgnum), `${body}`);
  }

  function remove(peer, msgnum) {
    const messages = getOrCreatePeer(`${peer}`).outbox;
    messages.delete(Nat(msgnum));
  }

  function setAcknum(peer, msgnum) {
    getOrCreatePeer(`${peer}`).ack = Nat(msgnum);
  }

  function exportToData() {
    const data = {};
    for (const [peer, inout] of state.entries()) {
      const exported = exportMailbox(inout);
      data[peer] = {
        inboundAck: exported.ack,
        outbox: exported.outbox,
      };
    }
    return harden(data);
  }

  function populateFromData(data) {
    !state.size || Fail`cannot populateFromData: outbox is not empty`;
    for (const peer of Object.getOwnPropertyNames(data)) {
      const inout = getOrCreatePeer(peer);
      const d = data[peer];
      importMailbox(
        {
          ack: d.inboundAck,
          outbox: d.outbox,
        },
        inout,
      );
    }
  }

  return harden({
    add,
    remove,
    setAcknum,
    exportToData,
    populateFromData,
  });
}

export function buildMailbox(state) {
  const srcPath = new URL('device-mailbox.js', import.meta.url).pathname;

  // endowments made available to the inner half
  let inboundCallback;

  function registerInboundCallback(cb) {
    inboundCallback = cb;
  }

  function add(peer, msgnum, body) {
    state.add(`${peer}`, Nat(msgnum), `${body}`);
  }

  function remove(peer, msgnum) {
    state.remove(`${peer}`, Nat(msgnum));
  }

  function setAcknum(peer, msgnum) {
    state.setAcknum(`${peer}`, Nat(msgnum));
  }

  // deliverInbound is made available to the host; it is used for inbound
  // messages and acks. The outbound direction uses the mailboxState object.
  // deliverInbound returns true if something changed, and the caller should
  // run the kernel's event loop.
  function deliverInbound(peer, messages, ack) {
    try {
      return Boolean(inboundCallback(peer, messages, ack));
    } catch (e) {
      throw Fail`error in inboundCallback: ${e}`;
    }
  }

  // srcPath and endowments are used at confg time by makeDeviceSlots.
  // deliverInbound is called to deliver each incoming message.
  return {
    srcPath,
    endowments: { registerInboundCallback, add, remove, setAcknum },
    deliverInbound,
  };
}
