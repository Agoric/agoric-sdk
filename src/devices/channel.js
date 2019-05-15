import harden from '@agoric/harden';

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
