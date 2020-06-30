/* global harden */

import { makeWallet } from './lib-wallet';
import pubsub from './pubsub';

function build(E, _D, _log) {
  let wallet;
  let pursesState;
  let inboxState = JSON.stringify([]);
  let http;
  const adminHandles = new Set();
  const bridgeHandles = new Set();
  const offerSubscriptions = new Map();

  const pushOfferSubscriptions = (channelHandle, offersStr) => {
    const offers = JSON.parse(offersStr);
    const subs = offerSubscriptions.get(channelHandle);
    (subs || []).forEach(({ origin, status }) => {
      // Filter by optional status and origin.
      const result = harden(
        offers.filter(
          offer =>
            (status === null || offer.status === status) &&
            offer.requestContext &&
            offer.requestContext.origin === origin,
        ),
      );
      E(http).send(
        {
          type: 'walletOfferDescriptions',
          data: result,
        },
        [channelHandle],
      );
    });
  };

  const subscribeToOffers = (channelHandle, { origin, status = null }) => {
    let subs = offerSubscriptions.get(channelHandle);
    if (!subs) {
      subs = [];
      offerSubscriptions.set(channelHandle, subs);
    }
    subs.push({ origin, status });
    pushOfferSubscriptions(channelHandle, inboxState);
  };

  const { publish: pursesPublish, subscribe: purseSubscribe } = pubsub(E);
  const { publish: inboxPublish, subscribe: inboxSubscribe } = pubsub(E);

  async function startup({ zoe, registry, board }) {
    wallet = await makeWallet({
      zoe,
      board,
      registry,
      pursesStateChangeHandler: pursesPublish,
      inboxStateChangeHandler: inboxPublish,
    });
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
          type: 'walletDeclineOfferResponse',
          data: await wallet.declineOffer(data),
        };
      }
      case 'walletCancelOffer': {
        return {
          type: 'walletCancelOfferResponse',
          data: await wallet.cancelOffer(data),
        };
      }
      case 'walletAcceptOffer': {
        const { outcome } = await wallet.acceptOffer(data);
        // We return the outcome only if it is a string. Otherwise we
        // return a default message.
        const result =
          typeof outcome === 'string'
            ? { outcome }
            : { outcome: 'Offer was made.' };
        return {
          type: 'walletAcceptOfferResponse',
          data: result,
        };
      }

      case 'walletGetOffers':
      case 'walletGetOfferDescriptions': {
        const result = await wallet.getOffers({ origin: meta.origin });
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
    // console.debug(`subscribing to walletPurseState`);
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

    // console.debug(`subscribing to walletInboxState`);
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

            // Get subscribed offers, too.
            for (const channelHandle of offerSubscriptions.keys()) {
              pushOfferSubscriptions(channelHandle, inboxState);
            }
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
            offerSubscriptions.delete(meta.channelHandle);
          },

          async onMessage(obj, meta) {
            const { type } = obj;
            switch (type) {
              case 'walletGetPurses':
              case 'walletAddOffer':
                return adminOnMessage(obj, meta);

              case 'walletSubscribeOffers': {
                const { status = null, dappOrigin } = obj;
                const { channelHandle } = meta;

                if (!channelHandle) {
                  return {
                    type: 'walletSubscribedOffers',
                    data: false,
                  };
                }

                // TODO: Maybe use the contract instanceId instead.
                subscribeToOffers(channelHandle, {
                  origin: dappOrigin,
                  status,
                });
                return {
                  type: 'walletSubscribedOffers',
                  data: true,
                };
              }

              case 'walletGetOffers': {
                const { dappOrigin, status = null } = obj;

                // Override the origin since we got it from the bridge.
                let result = await wallet.getOffers({ origin: dappOrigin });
                if (status !== null) {
                  // Filter by status.
                  result = harden(
                    result.filter(offer => offer.status === status),
                  );
                }

                return {
                  type: 'walletOfferDescriptions',
                  data: result,
                };
              }

              case 'walletGetDepositFacetId': {
                const { brandBoardId } = obj;
                const result = await wallet.getDepositFacetId(brandBoardId);
                return {
                  type: 'walletDepositFacetIdResponse',
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
