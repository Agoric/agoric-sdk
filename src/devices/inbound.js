
export default function buildInbound() {
  const bridge = { inboundCallback: undefined }; // not hardened
  const src = require.resolve('./inbound-src');
  function deliverInbound(sender, data) {
    if (!bridge.inboundCallback) {
      throw new Error('inboundCallback not yet registered');
    }
    bridge.inboundCallback(`${sender}`, `${data}`);
  }

  return {
    src,
    endowments: { bridge },
    deliverInbound, // for external access
    bridge, // for debugging/testing
  };
}
