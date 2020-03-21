// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';
import harden from '@agoric/harden';

export const getCapTPHandler = (E, sendMulticast, getBootstrapObject) => {
  const conns = new Map();
  const handler = harden({
    onConnect(_obj, meta) {
      const { connectionHandle, origin = 'unknown' } = meta || {};
      console.info(`Starting CapTP`, meta);
      const sendObj = o => {
        sendMulticast(o, [connectionHandle]);
      };
      const { dispatch, abort } = makeCapTP(
        origin,
        sendObj,
        getBootstrapObject,
      );
      conns.set(connectionHandle, [dispatch, abort]);
    },
    onDisconnect(_obj, meta) {
      console.log(`Finishing CapTP`, meta);
      const dispatchAbort = conns.get(meta.connectionHandle);
      if (dispatchAbort) {
        (1, dispatchAbort[1])();
      }
      conns.delete(meta.connectionHandle);
    },
    onError(obj, meta) {
      console.log(`Error in CapTP`, meta, obj.error);
    },
    onMessage(obj, meta) {
      console.error('processing inbound', obj);
      const dispatchAbort = conns.get(meta.connectionHandle);
      if (!dispatchAbort || !(1, dispatchAbort[0])(obj)) {
        console.error(`Could not find CapTP handler ${obj.type}`, meta);
        return false;
      }
      return true;
    },
  });

  return harden({
    getCommandHandler() {
      return handler;
    },
  });
};
