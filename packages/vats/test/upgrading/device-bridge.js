import { Far } from '@endo/far';

export const buildRootDeviceNode = tools => {
  let inboundHandler;
  const {
    endowments: { t, bridgeBackends },
  } = tools;
  return Far('fakeBridgeDevice', {
    callOutbound(dstID, obj) {
      t.assert(inboundHandler, 'callOutbound before registerInboundHandler');
      if (dstID in bridgeBackends) {
        return bridgeBackends[dstID](obj);
      }
      t.fail(`bridge unknown dstID ${dstID}`);
    },
    registerInboundHandler(handler) {
      t.assert(!inboundHandler, `already registered ${inboundHandler}`);
      inboundHandler = handler;
    },
    unregisterInboundHandler() {
      t.assert(
        inboundHandler,
        'unregisterInboundHandler before registerInboundHandler',
      );
      inboundHandler = undefined;
    },
  });
};
