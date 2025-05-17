import { assert, Fail } from '@endo/errors';
import { Nat } from '@endo/nat';
import { Far } from '@endo/far';

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;

  let deliverInboundMessages;
  let deliverInboundAck;

  function inboundCallback(peer, messages, ack) {
    if (!deliverInboundMessages) {
      throw Error(
        `mailbox.inboundCallback(${peer}) called before handler was registered`,
      );
    }
    assert.typeof(peer, 'string');
    for (const m of messages) {
      Nat(m[0]);
      assert.typeof(m[1], 'string');
    }
    Nat(ack);
    if (messages.length) {
      deliverInboundMessages(peer, harden(messages));
    }
    deliverInboundAck(peer, ack);
    return true; // always didSomething
  }
  endowments.registerInboundCallback(inboundCallback);

  // we keep no state in the device, it all lives elsewhere, as decided by
  // the host
  let { inboundHandler } = getDeviceState() || {};

  // console.debug(`device-mailbox build: inboundHandler is`, inboundHandler);
  deliverInboundMessages = (peer, newMessages) => {
    inboundHandler ||
      Fail`deliverInboundMessages before registerInboundHandler`;
    try {
      SO(inboundHandler).deliverInboundMessages(peer, newMessages);
    } catch (e) {
      console.error(`error during deliverInboundMessages: ${e}`, e);
    }
  };

  deliverInboundAck = (peer, ack) => {
    inboundHandler || Fail`deliverInboundAck before registerInboundHandler`;
    try {
      SO(inboundHandler).deliverInboundAck(peer, ack);
    } catch (e) {
      console.error(`error during deliverInboundAck:`, e);
    }
  };

  // the Root Device Node.
  return Far('root', {
    registerInboundHandler(handler) {
      !inboundHandler || Fail`already registered`;
      inboundHandler = handler;
      setDeviceState(harden({ inboundHandler }));
    },

    unregisterInboundHander() {
      inboundHandler = undefined;
    },

    add(peer, msgnum, body) {
      try {
        endowments.add(`${peer}`, Nat(msgnum), `${body}`);
      } catch (e) {
        Fail`error in add: ${e}`;
      }
    },

    remove(peer, msgnum) {
      try {
        endowments.remove(`${peer}`, Nat(msgnum));
      } catch (e) {
        Fail`error in remove: ${e}`;
      }
    },

    ackInbound(peer, msgnum) {
      try {
        endowments.setAcknum(`${peer}`, Nat(msgnum));
      } catch (e) {
        Fail`error in ackInbound: ${e}`;
      }
    },
  });
}
