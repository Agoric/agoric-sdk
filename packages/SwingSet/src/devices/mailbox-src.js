import { Nat } from '@agoric/nat';
import { Far } from '@agoric/marshal';

import { assert, details as X } from '@agoric/assert';

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const highestInboundDelivered = harden(new Map());
  const highestInboundAck = harden(new Map());

  let deliverInboundMessages;
  let deliverInboundAck;

  function inboundCallback(hPeer, hMessages, hAck) {
    const peer = `${hPeer}`;
    if (!deliverInboundMessages) {
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
      deliverInboundMessages(peer, harden(newMessages));
      didSomething = true;
    }
    let latestAck = 0;
    if (highestInboundAck.has(peer)) {
      latestAck = highestInboundAck.get(peer);
    }
    if (ack > latestAck) {
      highestInboundAck.set(peer, ack);
      deliverInboundAck(peer, ack);
      didSomething = true;
    }
    return didSomething;
  }
  endowments.registerInboundCallback(inboundCallback);

  // we keep no state in the device, it all lives elsewhere, as decided by
  // the host
  let { inboundHandler } = getDeviceState() || {};

  // console.debug(`mailbox-src build: inboundHandler is`, inboundHandler);
  deliverInboundMessages = (peer, newMessages) => {
    assert(
      inboundHandler,
      X`deliverInboundMessages before registerInboundHandler`,
    );
    try {
      SO(inboundHandler).deliverInboundMessages(peer, newMessages);
    } catch (e) {
      console.error(`error during deliverInboundMessages: ${e}`, e);
    }
  };

  deliverInboundAck = (peer, ack) => {
    assert(inboundHandler, X`deliverInboundAck before registerInboundHandler`);
    try {
      SO(inboundHandler).deliverInboundAck(peer, ack);
    } catch (e) {
      console.error(`error during deliverInboundAck:`, e);
    }
  };

  // the Root Device Node.
  return Far('root', {
    registerInboundHandler(handler) {
      assert(!inboundHandler, X`already registered`);
      inboundHandler = handler;
      setDeviceState(harden({ inboundHandler }));
    },

    add(peer, msgnum, body) {
      try {
        endowments.add(`${peer}`, Nat(msgnum), `${body}`);
      } catch (e) {
        assert.fail(X`error in add: ${e}`);
      }
    },

    remove(peer, msgnum) {
      try {
        endowments.remove(`${peer}`, Nat(msgnum));
      } catch (e) {
        assert.fail(X`error in remove: ${e}`);
      }
    },

    ackInbound(peer, msgnum) {
      try {
        endowments.setAcknum(`${peer}`, Nat(msgnum));
      } catch (e) {
        assert.fail(X`error in ackInbound: ${e}`);
      }
    },
  });
}
