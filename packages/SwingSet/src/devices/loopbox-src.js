import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';

export function buildRootDeviceNode(tools) {
  const { SO, endowments } = tools;
  const { registerPassOneMessage, deliverMode } = endowments;
  const inboundHandlers = harden(new Map());

  const queuedMessages = [];

  function loopboxPassOneMessage() {
    if (queuedMessages.length) {
      const [h, sender, count, body] = queuedMessages.shift();
      SO(h).deliverInboundMessages(sender, harden([[count, body]]));
      return true;
    }
    return false;
  }
  registerPassOneMessage(loopboxPassOneMessage);

  return Far('root', {
    registerInboundHandler(name, handler) {
      assert(!inboundHandlers.has(name), X`already registered`);
      inboundHandlers.set(name, handler);
    },

    makeSender(sender) {
      let count = 1;
      return Far('sender', {
        add(peer, msgnum, body) {
          assert(inboundHandlers.has(peer), X`unregistered peer '${peer}'`);
          const h = inboundHandlers.get(peer);
          if (deliverMode === 'immediate') {
            SO(h).deliverInboundMessages(sender, harden([[count, body]]));
          } else {
            queuedMessages.push([h, sender, count, body]);
          }
          count += 1;
        },
        remove(_peer, _msgnum) {},
        ackInbound(_peer, _msgnum) {},
      });
    },
  });
}
