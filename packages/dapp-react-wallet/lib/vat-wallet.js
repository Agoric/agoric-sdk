/* global harden */
import { E } from '@agoric/eventual-send';
import { makeWallet } from './lib-wallet';
import pubsub from './pubsub';

export function buildRootObject(_vatPowers) {
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

  async function startup({ zoe, board }) {
    wallet = await makeWallet({
      zoe,
      board,
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
        return {
          type: 'walletOfferAdded',
          data: await wallet.addOffer(data, meta),
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
        console.debug('Adding adminHandle', meta);
        adminHandles.add(meta.channelHandle);
      },
      onClose(_obj, meta) {
        console.debug('Removing adminHandle', meta);
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

              case 'walletSuggestIssuer': {
                const { petname, boardId } = obj;
                const result = await wallet.suggestIssuer(petname, boardId);
                return {
                  type: 'walletSuggestIssuerResponse',
                  data: result,
                };
              }

              case 'walletSuggestInstance': {
                const { petname, boardId } = obj;
                const result = await wallet.suggestInstance(petname, boardId);
                return {
                  type: 'walletSuggestInstanceResponse',
                  data: result,
                };
              }

              case 'walletSuggestInstallation': {
                const { petname, boardId } = obj;
                const result = await wallet.suggestInstallation(
                  petname,
                  boardId,
                );
                return {
                  type: 'walletSuggestInstallationResponse',
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
