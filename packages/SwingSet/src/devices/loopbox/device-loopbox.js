import { Fail } from '@endo/errors';
import { Far } from '@endo/far';

export function buildRootDeviceNode(tools) {
  const { SO, endowments, deviceParameters, getDeviceState, setDeviceState } =
    tools;
  const { registerPassOneMessage, deliverMode } = endowments;

  function makeSender(sender) {
    return Far('sender', {
      add(peer, msgnum, body) {
        const oldDS = getDeviceState();
        oldDS.inboundHandlers[peer] || Fail`unregistered peer '${peer}'`;
        const h = oldDS.inboundHandlers[peer];
        const newDS = { ...oldDS };
        if (deliverMode === 'immediate') {
          SO(h).deliverInboundMessages(
            sender,
            harden([[oldDS.counts[sender], body]]),
          );
        } else {
          newDS.queuedMessages = Array.from(newDS.queuedMessages);
          newDS.queuedMessages.push([h, sender, oldDS.counts[sender], body]);
        }
        newDS.counts = { ...newDS.counts };
        newDS.counts[sender] += 1;
        setDeviceState(harden(newDS));
      },
      remove(_peer, _msgnum) {},
      ackInbound(_peer, _msgnum) {},
    });
  }

  let deviceState = getDeviceState();
  if (!deviceState) {
    deviceState = {
      queuedMessages: [],
      counts: {},
      inboundHandlers: {},
    };
    for (const senderName of deviceParameters.senders) {
      deviceState.counts[senderName] = 1;
    }
    harden(deviceState);
  }
  const senderMap = new Map();
  const senders = [];
  for (const senderName of deviceParameters.senders) {
    const sender = makeSender(senderName);
    senders.push(sender);
    senderMap.set(senderName, sender);
  }
  // Devices don't use transcripts or orthogonal persistence, so e.g. if a
  // client called `makeSender()` as part of its setup the result wouldn't be
  // available on subsequent replays, which would break replay-ability entirely.
  // Instead, we rely on the fact `builtRootDeviceNode` will be called (exactly
  // once) during each actual execution (i.e., initialization or replay) and
  // require that its results be stashed somewhere prior to any attempt to use
  // them.  This in turn requires a couple of compromises with what might be a
  // more ideal device API.  First, clients must declare up front all the
  // loopbox senders they are going to ever need; fortunately, this is not a
  // terribly onerous burden because this device is only intended for tests,
  // where the scope of behavior is well defined.  Second, we abuse
  // `setDeviceState()`, and the `m.serialize()` it does to assign consistent
  // vrefs to our Sender remotables, every time the device is instantiated.  But
  // we must immediately overwrite the state with data that omits all the
  // Remotables, since they cannot be synthesized by `m.unserialize()` during
  // the next launch (in fact, to protect ourselves when we are in replay, we
  // need to actually capture the state prior to doing this in order to restore
  // that state after having used the write mechanism solely for its side effect
  // of generating vrefs for the remotables).
  setDeviceState(harden(senders));
  setDeviceState(deviceState);

  function loopboxPassOneMessage() {
    const oldDS = getDeviceState();
    if (oldDS.queuedMessages.length) {
      const newDS = { ...oldDS };
      newDS.queuedMessages = Array.from(newDS.queuedMessages);
      const [h, sender, count, body] = newDS.queuedMessages.shift();
      SO(h).deliverInboundMessages(sender, harden([[count, body]]));
      setDeviceState(harden(newDS));
      return true;
    }
    return false;
  }
  registerPassOneMessage(loopboxPassOneMessage);

  return Far('root', {
    registerInboundHandler(name, handler) {
      const oldDS = getDeviceState();
      !oldDS.inboundHandlers[name] || Fail`already registered`;
      const newDS = { ...oldDS };
      newDS.inboundHandlers = { ...newDS.inboundHandlers };
      newDS.inboundHandlers[name] = handler;
      setDeviceState(harden(newDS));
    },

    getSender(sender) {
      return senderMap.get(sender);
    },
  });
}
