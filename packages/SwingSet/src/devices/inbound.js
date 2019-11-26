export default function buildInbound() {
  const bridge = { inboundCallback: undefined }; // not hardened
  const srcPath = require.resolve('./inbound-src');
  function deliverInbound(sender, data) {
    if (!bridge.inboundCallback) {
      throw new Error('inboundCallback not yet registered');
    }
    bridge.inboundCallback(`${sender}`, `${data}`);
  }

  return {
    srcPath,
    endowments: { bridge },
    deliverInbound, // for external access
    bridge, // for debugging/testing
  };
}
