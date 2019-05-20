/*
 The 'outbox' is a special section of the kernel state vector, which can be
 populated with outbound messages through this device. It gets access to
 this section through an endowment, so the host can place it wherever it
 likes.

 Outbox messages are either delivered to the recipient as part of the host
 state vector (e.g. if the sending machine lives in a blockchain), or as
 distinct transport messages (for sending machines in a solo process). The
 host loop is expected to examine the outbox buffer after the kernel has
 quiesced (i.e. after `await controller.run()`), then transmit any messages
 that have not already been transmitted since the process started.

 Each outbox is paired with an acknowledgment channel, which delivers a
 sequence number for the most recent message that was successfully received.
 For each recipient, this device provides both an outbox buffer and an ack
 buffer. To avoid an endless cycle of acks acking acks, the acks must be
 delivered specially, outside of the normal outbox messages.
*/

import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function buildOutbox() {
  const srcPath = require.resolve('./outbox-src');

  // state[recipient].outbox[msgnum] = body
  // state[recipient].inboundAck = acknum
  const state = harden(new Map());

  function getOrCreateRecipient(recipient) {
    if (!state.has(recipient)) {
      state.set(recipient, { outbox: new Map(), inboundAck: undefined });
    }
    return state.get(recipient);
  }

  function addToOutbox(recipient, msgnum, body) {
    getOrCreateRecipient(`${recipient}`).outbox.set(Nat(msgnum), `${body}`);
  }

  function removeFromOutbox(recipient, msgnum) {
    const messages = getOrCreateRecipient(`${recipient}`).outbox;
    messages.delete(Nat(msgnum));
  }

  function setAcknum(recipient, msgnum) {
    getOrCreateRecipient(`${recipient}`).inboundAck = Nat(msgnum);
  }

  function exportToData() {
    const data = {};
    state.forEach((inout, recipient) => {
      const messages = {};
      inout.outbox.forEach((body, msgnum) => {
        messages[msgnum] = body;
      });
      data[recipient] = { outbox: messages, inboundAck: inout.inboundAck };
    });
    return harden(data);
  }

  function populateFromData(data) {
    if (state.size) {
      throw new Error(`cannot populateFromData: outbox is not empty`);
    }
    for (const recipient of Object.getOwnPropertyNames(data)) {
      const inout = getOrCreateRecipient(recipient);
      const d = data[recipient];
      for (const msgnum of Object.getOwnPropertyNames(d.outbox)) {
        inout.outbox.set(msgnum, d.outbox[msgnum]);
      }
      inout.inboundAck = d.inboundAck;
    }
  }

  return {
    srcPath,
    endowments: { addToOutbox, removeFromOutbox, setAcknum },
    state,
    exportToData,
    populateFromData,
  };
}
