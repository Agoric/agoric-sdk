/*
  The 'mailbox' device helps manage bidirectional communication with a number
  of 'peers'. Each peer is identified with a string. We exchange ordered
  acknowledged messages with each peer, conveyed by a host- and peer-
  specific process. The mailbox device is only made available to a special
  'VatTP' vat, which manages the acknowledgments.

   mailboxDevice <-> vat-VatTP <-> vat-comms <-> vat-target

  In the outbound direction, the mailbox device manages a special section of
  the kernel special section of the kernel state vector. For each peer, this
  'mailboxState' object contains a list of outstanding messages (each with a
  msgnum integer and a string body), and an 'ackNum' (an integer which
  indicates the highest-numbered inbound message that has been processed).

  When the comms vat wants to send a message, it sends a 'send()' message to
  the vatTP, as 'send(peer, msg)'. When this arrives on vat-VatTP, it invokes
  the device's 'add' method, as add(peer, msgnum, msg). The add() function
  modifies the mailboxState vector. This all takes place while the kernel run
  loop is processing the run-queue, so no actual messages are transmitted yet.

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

  ... describe inbound side, acks

*/

import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// This Map-based mailboxState object is a good starting point, but we may
// replace it with one that tracks which parts of the state have been
// modified, to build more efficient Merkle proofs.

export function buildMailboxStateMap() {
  const state = harden(new Map());

  function getOrCreatePeer(peer) {
    if (!state.has(peer)) {
      state.set(peer, { outbox: harden(new Map()), inboundAck: undefined });
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
    getOrCreatePeer(`${peer}`).inboundAck = Nat(msgnum);
  }

  function exportToData() {
    const data = {};
    state.forEach((inout, peer) => {
      const messages = {};
      inout.outbox.forEach((body, msgnum) => {
        messages[msgnum] = body;
      });
      data[peer] = { outbox: messages, inboundAck: inout.inboundAck };
    });
    return harden(data);
  }

  function populateFromData(data) {
    if (state.size) {
      throw new Error(`cannot populateFromData: outbox is not empty`);
    }
    for (const peer of Object.getOwnPropertyNames(data)) {
      const inout = getOrCreatePeer(peer);
      const d = data[peer];
      for (const msgnum of Object.getOwnPropertyNames(d.outbox)) {
        inout.outbox.set(msgnum, d.outbox[msgnum]);
      }
      inout.inboundAck = d.inboundAck;
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
  const srcPath = require.resolve('./mailbox-src');

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

  // Functions made available to the host: these are used for inbound
  // messages and acks. The outbound direction uses the mailboxState object.

  function deliverInbound(peer, messages, ack) {
    try {
      inboundCallback(peer, messages, ack);
    } catch (e) {
      throw new Error(`error in inboundCallback: ${e} ${e.message}`);
    }
  }

  return {
    srcPath,
    endowments: { registerInboundCallback, add, remove, setAcknum },
    deliverInbound,
  };
}
