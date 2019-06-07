import harden from '@agoric/harden';

export default function setup(syscall, state, helpers, endowments) {
  const { bridge } = endowments;
  let { inboundHandler } = state.get() || {};

  return helpers.makeDeviceSlots(
    syscall,
    SO => {
      bridge.inboundCallback = (sender, message) => {
        if (!inboundHandler) {
          throw new Error(`inboundCallback before registerInboundHandler`);
        }
        try {
          SO(inboundHandler).inbound(`${sender}`, `${message}`);
        } catch (e) {
          console.log(`error during inboundCallback: ${e} ${e.message}`);
        }
      };
      return harden({
        // todo: rename this to registerInboundHandler for consistency
        registerInboundCallback(handler) {
          inboundHandler = handler;
          state.set({ inboundHandler });
        },
      });
    },
    helpers.name,
  );
}
