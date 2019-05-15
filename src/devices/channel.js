import harden from '@agoric/harden';

/*

This "Channel Device" enables "inbound" communication from the host
environment into a set of vats, and "outbound" communication from those vats
into the host environment.

The device calls these different sides "machines", each of which has a name.
Every message is sent from one machine (`fromMachineName`) and to a different
machine (`toMachineName`). The message body itself is always a string.

To send a message from the host environment, call `deliverInbound(from, to,
data)`. This `deliverInbound` is part of the object returned by
`buildChannel()`.

To send a message from a vat (given access to the device node, held in a
variable named `devNode`), use `D(devNode).sendOutbound(from, to, data)`.

To receive messages in the host environment, call
`registerOutboundCallback(to, f)` (which is part of the object returned by
`buildChannel`). The callback function will be invoked like `f(from, data)`.

To receive messages from a vat, use `D(devNode).registerInboundHandler(to,
handler)`. The handler object will be invoked like `handler.inbound(from,
data)`.

*/

export default function buildChannel() {
  const bridge = harden(new Map());
  const srcPath = require.resolve('./channel-src');
  function deliverInbound(fromMachineName, toMachineName, data) {
    if (!bridge.has(toMachineName)) {
      throw new Error('handler not yet registered');
    }
    bridge.get(toMachineName)(fromMachineName, data);
  }
  function registerOutboundCallback(machineName, f) {
    if (bridge.has(machineName)) {
      throw new Error(`${machineName} is already registered`);
    }
    bridge.set(machineName, f);
  }

  return {
    srcPath,
    endowments: { bridge },
    // these two are for external access
    deliverInbound,
    registerOutboundCallback,
    // these are for debugging/testing
    bridge,
  };
}
