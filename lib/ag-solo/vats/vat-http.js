import harden from '@agoric/harden';

import { getReplHandler } from './repl';

// This vat contains the HTTP request handler.

function build(E, D) {
  let commandDevice;
  let provisioner;
  const homeObjects = { LOADING: 'fetching home objects' };

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
        Object.assign(
          handler,
          getReplHandler(E, homeObjects, msg =>
            D(commandDevice).sendBroadcast(msg),
          ),
        );
      }
      if (ROLES.controller) {
        handler.pleaseProvision = obj => {
          const { nickname, pubkey } = obj;
          return E(provisioner).pleaseProvision(nickname, pubkey);
        };
      }
    },

    setProvisioner(p) {
      provisioner = p;
    },

    setPresences(ps) {
      delete homeObjects.LOADING;
      Object.assign(homeObjects, ps);
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
    inbound(count, obj) {
      console.log(`vat-http.inbound (from browser) ${count}`, obj);
      const p = Promise.resolve(handler[obj.type](obj));
      p.then(
        res => D(commandDevice).sendResponse(count, false, harden(res)),
        rej => D(commandDevice).sendResponse(count, true, harden(rej)),
      );
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
