import { BridgeId } from '@agoric/internal';
import { Far } from '@endo/far';

export const buildRootDeviceNode = tools => {
  let inboundHandler;
  const {
    endowments: { t, expectedStorageValues },
  } = tools;
  return Far('fakeBridgeDevice', {
    callOutbound(dstID, obj) {
      t.assert(inboundHandler, 'callOutbound before registerInboundHandler');
      switch (dstID) {
        case BridgeId.STORAGE: {
          const { method, args } = obj;
          t.is(method, 'set', `storage bridge method must be 'set'`);
          t.deepEqual(args, [['root1', expectedStorageValues.shift()]]);
          return undefined;
        }
        default: {
          t.fail(`bridge unknown dstID ${dstID}`);
          return false;
        }
      }
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
