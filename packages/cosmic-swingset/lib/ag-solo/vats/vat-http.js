import harden from '@agoric/harden';

import { getReplHandler } from './repl';
import { getCapTPHandler } from './captp';

// This vat contains the HTTP request handler.
function build(E, D) {
  let commandDevice;
  let provisioner;
  const connectionIdToHandle = new Map();
  const connectionHandleToId = new WeakMap();
  const loaded = {};
  loaded.p = new Promise((resolve, reject) => {
    loaded.res = resolve;
    loaded.rej = reject;
  });
  harden(loaded);
  const homeObjects = { LOADING: loaded.p };
  let isReady = false;
  const readyForClient = {};
  let exportedToCapTP = {
    LOADING: loaded.p,
    READY: {
      resolve(value) {
        isReady = true;
        readyForClient.res(value);
      },
      isReady() {
        return isReady;
      },
    },
  };

  const sendMulticast = (obj, connectionHandles) => {
    // TODO: Make this sane by adding support for multicast to the commandDevice.
    for (const connectionHandle of connectionHandles) {
      const connectionID = connectionHandleToId.get(connectionHandle);
      if (connectionID) {
        const o = { ...obj, meta: { connectionID } };
        D(commandDevice).sendBroadcast(o);
      }
    }
  };

  readyForClient.p = new Promise((resolve, reject) => {
    readyForClient.res = resolve;
    readyForClient.rej = reject;
  });
  harden(readyForClient);

  const handler = {};
  const registeredURLHandlers = new Map();

  // TODO: Don't leak memory.
  async function registerURLHandler(newHandler, url) {
    const commandHandler = await E(newHandler).getCommandHandler();
    let reg = registeredURLHandlers.get(url);
    if (!reg) {
      reg = [];
      registeredURLHandlers.set(url, reg);
    }
    reg.push(commandHandler);
  }

  return {
    setCommandDevice(d, ROLES) {
      commandDevice = d;
      if (ROLES.client) {
        handler.readyForClient = () => readyForClient.p;

        const replHandler = getReplHandler(E, homeObjects, sendMulticast);
        registerURLHandler(replHandler, '/private/repl');

        // Assign the captp handler.
        // TODO: Break this out into a separate vat.
        const captpHandler = getCapTPHandler(E, sendMulticast, () =>
          // Harden only our exported objects.
          harden(exportedToCapTP),
        );
        registerURLHandler(captpHandler, '/private/captp');
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
          return Promise.all(
            applies.map(args =>
              // Emulate allSettled.
              E(provisioner)
                .pleaseProvision(...args)
                .then(
                  value => ({ status: 'fulfilled', value }),
                  reason => ({ status: 'rejected', reason }),
                ),
            ),
          );
        };
      }
    },

    registerURLHandler,
    registerAPIHandler: h => registerURLHandler(h, '/api'),
    sendMulticast,

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
    },

    // devices.command invokes our inbound() because we passed to
    // registerInboundHandler()
    async inbound(count, rawObj) {
      console.debug(
        `vat-http.inbound (from browser) ${count}`,
        JSON.stringify(rawObj, undefined, 2),
      );

      const { type, meta: rawMeta = {} } = rawObj || {};
      const {
        url = '/private/repl',
        connectionID: rawConnectionID,
        dispatcher = 'onMessage',
      } = rawMeta;

      try {
        let connectionHandle = connectionIdToHandle.get(rawConnectionID);
        if (dispatcher === 'onConnect') {
          connectionHandle = harden({});
          connectionIdToHandle.set(rawConnectionID, connectionHandle);
          connectionHandleToId.set(connectionHandle, rawConnectionID);
        } else if (dispatcher === 'onDisconnect') {
          connectionIdToHandle.delete(rawConnectionID);
          connectionHandleToId.delete(connectionHandle);
        }

        const obj = {
          ...rawObj,
        };
        delete obj.meta;

        const meta = {
          ...rawMeta,
          connectionHandle,
        };
        delete meta.connectionID;

        if (url === '/private/repl') {
          // Use our local handler object (compatibility).
          // TODO: standardise
          if (handler[type]) {
            D(commandDevice).sendResponse(
              count,
              false,
              handler[type](obj, meta),
            );
            return;
          }
        }

        const urlHandlers = registeredURLHandlers.get(url);
        if (urlHandlers) {
          // todo fixme avoid the loop
          // For now, go from the end to beginning so that handlers
          // override.
          for (let i = urlHandlers.length - 1; i >= 0; i -= 1) {
            // eslint-disable-next-line no-await-in-loop
            const res = await E(urlHandlers[i])[dispatcher](obj, meta);

            if (res) {
              D(commandDevice).sendResponse(count, false, harden(res));
              return;
            }
          }
        }

        if (dispatcher === 'onMessage') {
          throw Error(`No handler for ${url} ${type}`);
        }
        D(commandDevice).sendResponse(count, false, harden(true));
      } catch (rej) {
        console.debug(`Error ${dispatcher}:`, rej);
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
