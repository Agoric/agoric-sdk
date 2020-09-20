// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

export const getCapTPHandler = (
  send,
  getAdminAndConnectionFacets,
  fallback = undefined,
) => {
  const chans = new Map();
  const doCall = (obj, method, ...args) => {
    if (obj) {
      return E(obj)
        [method](...args)
        .catch(_ => {});
    }
    return undefined;
  };
  const handler = harden({
    onOpen(obj, meta) {
      const { channelHandle, origin = 'unknown' } = meta || {};
      console.debug(`Starting CapTP`, meta);
      const sendObj = o => {
        send(o, [channelHandle]);
      };
      const adminFacetPK = makePromiseKit();
      const connectionFacetPK = makePromiseKit();
      let booted = false;
      const { dispatch, abort, getBootstrap } = makeCapTP(
        origin,
        sendObj,
        async () => {
          if (!booted) {
            booted = true;
            const admconnP = getAdminAndConnectionFacets(meta, getBootstrap());
            adminFacetPK.resolve(E.G(admconnP).adminFacet);
            connectionFacetPK.resolve(E.G(admconnP).connectionFacet);
          }
          return connectionFacetPK.promise;
        },
        {
          onReject(err) {
            // Be quieter for sanity's sake.
            console.log('CapTP', origin, 'exception:', err);
          },
        },
      );
      chans.set(channelHandle, {
        dispatch,
        abort,
        adminFacet: adminFacetPK.promise,
      });
      doCall(fallback, 'onOpen', obj, meta);
    },
    onClose(obj, meta) {
      console.debug(`Finishing CapTP`, meta);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort, adminFacet } = chan;
        doCall(adminFacet, 'onClose');
        abort();
      }
      chans.delete(meta.channelHandle);
      doCall(fallback, 'onClose', obj, meta);
    },
    onError(obj, meta) {
      console.debug(`Error in CapTP`, meta, obj.error);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort, adminFacet } = chan;
        doCall(adminFacet, 'onError', obj.error);
        abort(obj.error);
      }
      doCall(fallback, 'onError', obj, meta);
    },
    async onMessage(obj, meta) {
      console.debug('processing inbound', obj);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { dispatch } = chan;
        if (dispatch(obj)) {
          return true;
        }
      }
      const done = await doCall(fallback, 'onMessage', obj, meta);
      if (!done) {
        console.error(`Could not find CapTP handler ${obj.type}`, meta);
      }
      return done;
    },
  });

  return harden(handler);
};
