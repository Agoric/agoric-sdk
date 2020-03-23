import harden from '@agoric/harden';
import { makeWallet } from './lib-wallet';
import pubsub from './pubsub';

function build(E, _D, _log) {
  let wallet;
  let pursesState;
  let inboxState;
  let http;
  const adminHandles = new Set();
  const bridgeHandles = new Set();

  const { publish: pursesPublish, subscribe: purseSubscribe } = pubsub(E);
  const { publish: inboxPublish, subscribe: inboxSubscribe } = pubsub(E);

  async function startup(zoe, registrar) {
    wallet = await makeWallet(E, zoe, registrar, pursesPublish, inboxPublish);
  }

  async function getWallet() {
    return harden(wallet);
  }

  function setHTTPObject(o, _ROLES) {
    http = o;
  }

  async function adminOnMessage(obj, meta = { origin: 'unknown' }) {
    const { type, data } = obj;
    switch (type) {
      case 'walletGetPurses': {
        return {
          type: 'walletUpdatePurses',
          data: pursesState || {},
        };
      }
      case 'walletGetInbox': {
        return {
          type: 'walletUpdateInbox',
          data: inboxState || {},
        };
      }
      case 'walletAddOffer': {
        // We only need to do this because we can't reach addOffer.
        const hooks = wallet.hydrateHooks(data.hooks);
        return {
          type: 'walletOfferAdded',
          data: await wallet.addOffer(data, hooks, meta),
        };
      }
      case 'walletDeclineOffer': {
        return {
          type: 'walletOfferDeclined',
          data: await wallet.declineOffer(data),
        };
      }
      case 'walletCancelOffer': {
        return {
          type: 'walletOfferCancelled',
          data: await wallet.cancelOffer(data),
        };
      }
      case 'walletAcceptOffer': {
        await wallet.acceptOffer(data);
        return {
          type: 'walletOfferAccepted',
          data: true,
        };
      }

      case 'walletGetOffers':
      case 'walletGetOfferDescriptions': {
        const result = await wallet.getOffers(data);
        return {
          type: 'walletOfferDescriptions',
          data: result,
        };
      }

      default: {
        return false;
      }
    }
  }

  function setPresences() {
    // console.log(`subscribing to walletPurseState`);
    // This provokes an immediate update
    purseSubscribe(
      harden({
        notify(m) {
          pursesState = m;
          if (http) {
            E(http).send(
              {
                type: 'walletUpdatePurses',
                data: pursesState,
              },
              [...adminHandles.keys(), ...bridgeHandles.keys()],
            );
          }
        },
      }),
    );

    // console.log(`subscribing to walletInboxState`);
    // This provokes an immediate update
    inboxSubscribe(
      harden({
        notify(m) {
          inboxState = m;
          if (http) {
            E(http).send(
              {
                type: 'walletUpdateInbox',
                data: inboxState,
              },
              [...adminHandles.keys()],
            );

            // TODO: Get subscribed offers, too.
          }
        },
      }),
    );
  }

  function getCommandHandler() {
    return harden({
      onOpen(_obj, meta) {
        console.error('Adding adminHandle', meta);
        adminHandles.add(meta.channelHandle);
      },
      onClose(_obj, meta) {
        console.error('Removing adminHandle', meta);
        adminHandles.delete(meta.channelHandle);
      },
      onMessage: adminOnMessage,
    });
  }

  function getBridgeURLHandler() {
    return harden({
      getCommandHandler() {
        return harden({
          onOpen(_obj, meta) {
            bridgeHandles.add(meta.channelHandle);
          },
          onClose(_obj, meta) {
            bridgeHandles.delete(meta.channelHandle);
          },

          async onMessage(obj, meta) {
            const { type } = obj;
            switch (type) {
              case 'walletGetPurses':
              case 'walletAddOffer':
                // Override the origin since we got it from the bridge.
                return adminOnMessage(obj, {
                  ...meta,
                  origin: obj.dappOrigin,
                });

              case 'walletGetOffers': {
                const { status = null } = obj;
                // Override the origin since we got it from the bridge.
                const result = await wallet.getOffers({
                  origin: obj.dappOrigin,
                  status,
                });
                return {
                  type: 'walletOfferDescriptions',
                  data: result,
                };
              }

              default:
                return Promise.resolve(false);
            }
          },
        });
      },
    });
  }

  return harden({
    startup,
    getWallet,
    setHTTPObject,
    getCommandHandler,
    getBridgeURLHandler,
    setPresences,
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => build(E, D, helpers.log),
    helpers.vatID,
  );
}
