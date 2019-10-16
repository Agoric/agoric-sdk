import harden from '@agoric/harden';
import makeCapTP from '@agoric/captp';

import { getReplHandler } from './repl';

// This vat contains the HTTP request handler.
function build(E, D) {
  let commandDevice;
  let provisioner;
  const loaded = {};
  loaded.p = new Promise((resolve, reject) => {
    loaded.res = resolve;
    loaded.rej = reject;
  });
  harden(loaded);
  const homeObjects = { LOADING: loaded.p };
  let isReady = false;
  let exportedToCapTP = {
    LOADING: loaded.p,
    READY: {
      resolve(value) { isReady = true; readyForClient.res(value); },
      isReady() { return isReady; },
    },
  };

  const readyForClient = {};
  readyForClient.p = new Promise((resolve, reject) => {
    readyForClient.res = resolve;
    readyForClient.rej = reject;
  });
  harden(readyForClient);

  let handler = {};
  let canvasState;

  return {
    setCommandDevice(d, ROLES) {
      commandDevice = d;
      handler = {
        getCanvasState() {
          if (!canvasState) {
            return {};
          }
          return {
            type: 'updateCanvas',
            state: canvasState,
          };
        },
      };
      if (ROLES.client) {
        const conns = new Map();
        const forward = method => obj => {
          const handlers = conns.get(obj.connectionID);
          if (!handlers || !handlers[method]) {
            console.log(
              `Could not find CapTP handler ${method}`,
              obj.connectionID,
            );
            return undefined;
          }
          return handlers[method](obj);
        };
        Object.assign(
          handler,
          getReplHandler(E, homeObjects, msg =>
            D(commandDevice).sendBroadcast(msg),
          ),
          {
            readyForClient() {
              return readyForClient.p;
            },
          },
          {
            CTP_OPEN(obj) {
              console.log(`Starting CapTP`, obj.connectionID);
              const sendObj = o => {
                o.connectionID = obj.connectionID;
                D(commandDevice).sendBroadcast(o);
              };
              const [handlers] = makeCapTP(obj.connectionID, sendObj, () =>
                // Harden only our exported objects.
                harden(exportedToCapTP),
              );
              conns.set(obj.connectionID, handlers);
            },
            CTP_CLOSE(obj) {
              console.log(`Finishing CapTP`, obj.connectionID);
              conns.delete(obj.connectionID);
            },
            CTP_ERROR(obj) {
              console.log(`Error in CapTP`, obj.connectionID, obj.error);
            },
            CTP_BOOTSTRAP: forward('CTP_BOOTSTRAP'),
            CTP_CALL: forward('CTP_CALL'),
            CTP_RETURN: forward('CTP_RETURN'),
            CTP_RESOLVE: forward('CTP_RESOLVE'),
          },
        );
      }
      if (ROLES.controller) {
        handler.pleaseProvision = obj => {
          const { nickname, pubkey } = obj;
          // FIXME: There's a race here.  We return from the call
          // before the outbound messages have been committed to
          // a block.  This means the provisioning-server must
          // retry transactions as they might have the wrong sequence
          // number.
          return E(provisioner).pleaseProvision(nickname, pubkey);
        };
      }
    },

    setProvisioner(p) {
      provisioner = p;
    },

    setPresences(ps, privateObjects) {
      exportedToCapTP = { READY: exportedToCapTP.READY, ...ps, ...privateObjects };
      Object.assign(homeObjects, ps, privateObjects);
      loaded.res('chain bundle loaded');
      if (ps.canvasStatePublisher) {
        const subscriber = harden({
          notify(m) {
            // m will be a string, JSON.stringify([[],[],..])
            // created by ERTP/more/pixels/gallery.js setPixelState()
            canvasState = m;
            if (commandDevice) {
              D(commandDevice).sendBroadcast({
                type: 'updateCanvas',
                state: canvasState,
              });
            }
          },
        });
        console.log(`subscribing to canvasStatePublisher`);
        // This provokes an immediate update
        E(ps.canvasStatePublisher).subscribe(subscriber);
      }
    },

    // devices.command invokes our inbound() because we passed to
    // registerInboundHandler()
    async inbound(count, obj) {
      try {
        console.log(`vat-http.inbound (from browser) ${count}`, obj);
        const res = await handler[obj.type](obj);
        D(commandDevice).sendResponse(count, false, harden(res));
      } catch (rej) {
        D(commandDevice).sendResponse(count, true, harden(rej));
      }
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => harden(build(E, D)),
    helpers.vatID,
  );
}
