// The 'outbox' is a special section of the kernel state vector, which can be
// populated with outbound messages through this device. It gets access to
// this section through an endowment, so the host can place it wherever it
// likes.

import harden from '@agoric/harden';

export default function buildOutbox() {
  const srcPath = require.resolve('./outbox-src');

  const outbox = harden(new Map()); // outbox[recipient][msgnum] = data

  function addToOutbox(recipient, msgnum, data) {
    if (!outbox.has(recipient)) {
      outbox.set(recipient, new Map());
    }
    outbox.get(recipient).set(msgnum, data);
  }

  function removeFromOutbox(recipient, msgnum) {
    if (outbox.has(recipient)) {
      const messages = outbox.get(recipient);
      messages.delete(msgnum);
      if (!messages.size) {
        outbox.delete(recipient);
      }
    }
  }

  function convertMapsToObjects(m) {
    const outboxData = {};
    m.forEach((msgs, recipient) => {
      const messages = {};
      let haveMessages = false;
      msgs.forEach((data, msgnum) => {
        messages[msgnum] = data;
        haveMessages = true;
      });
      if (haveMessages) {
        outboxData[recipient] = messages;
      }
    });
    return harden(outboxData);
  }

  function populateMapsFromObjects(s, mapToModify) {
    if (mapToModify.size) {
      throw new Error(`cannot loadState: outbox is not empty`);
    }
    for (const recipient of Object.getOwnPropertyNames(s)) {
      const m = new Map();
      mapToModify.set(recipient, m);
      const messages = s[recipient];
      for (const msgnum of Object.getOwnPropertyNames(messages)) {
        m.set(msgnum, messages[msgnum]);
      }
    }
  }

  return {
    srcPath,
    endowments: { addToOutbox, removeFromOutbox },
    outbox,
    convertMapsToObjects,
    populateMapsFromObjects,
  };
}
