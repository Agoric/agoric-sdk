import harden from '@agoric/harden';

import { getReplHandler } from './repl';
// import { getCapTP } from './captp';

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
          // getCapTP(homeObjects),
        );
        handler.uploadContract = async obj => {
          const { connectionID, source, moduleType } = obj;
          if (!homeObjects.contractHost) {
            throw Error('home.contractHost is not available');
          }
          console.log('would upload', moduleType);
          D(commandDevice).sendBroadcast({
            type: 'contractUploaded',
            connectionID,
            code: 99,
          });
        };
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
    async inbound(count, obj) {
      try {
        console.log(`vat-http.inbound (from browser) ${count}`, obj);
        const res = await handler[obj.type](obj);
        D(commandDevice).sendResponse(count, false, res);
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
