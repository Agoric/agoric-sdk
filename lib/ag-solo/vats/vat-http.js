import harden from '@agoric/harden';
// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';

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
  const registeredHandlers = [];
  let canvasState;

  // TODO: Don't leak memory.
  async function registerCommandHandler(newHandler) {
    const commandHandler = await E(newHandler).getCommandHandler();
    registeredHandlers.push(commandHandler);
  }

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
          const dispatch = conns.get(obj.connectionID);
          if (!dispatch || !dispatch(obj)) {
            console.log(
              `Could not find CapTP handler ${method}`,
              obj.connectionID,
            );
            return undefined;
          }
          return true;
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
              const { dispatch } = makeCapTP(obj.connectionID, sendObj, () =>
                // Harden only our exported objects.
                harden(exportedToCapTP),
              );
              conns.set(obj.connectionID, dispatch);
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
        handler.pleaseProvisionMany = obj => {
          const { applies } = obj;
          return Promise.all(applies.map(args =>
            E(provisioner).pleaseProvision(...args)));
        };
      }
    },

    registerCommandHandler,

    setProvisioner(p) {
      provisioner = p;
    },

    setPresences(ps, privateObjects) {
      exportedToCapTP = {
        LOADING: loaded.p,
        READY: exportedToCapTP.READY,
        ...ps,
        ...privateObjects,
      };
      Object.assign(homeObjects, ps, privateObjects);
      loaded.res('chain bundle loaded');
      delete homeObjects.LOADING;
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

        const { type } = obj;
        // Try on local handlers first.
        let res;
        // Try on registered handlers.
        if (type in handler) {
          res = await handler[type](obj);
        } else {
          // todo fixme avoid the loop
          // For now, go from the end to beginning so that handlers
          // override.
          const hardObjects = harden({...homeObjects});
          for (let i = registeredHandlers.length - 1; i >= 0; i--) {
            res = await E(registeredHandlers[i]).processInbound(obj, hardObjects);
            if (res) {
              break;
            }
          }
        }

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
