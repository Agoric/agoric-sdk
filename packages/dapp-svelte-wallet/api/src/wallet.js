// @ts-check
import { E } from '@agoric/eventual-send';
import { makeNotifierKit, observeIteration } from '@agoric/notifier';

import { makeWallet } from './lib-wallet';
import pubsub from './pubsub';

export function buildRootObject(_vatPowers) {
  let walletInternals;
  /** @type {Array<[string, any]>} */
  let pursesState = [];
  /** @type {Array<[string, any]>} */
  let inboxState = [];
  let http;
  const bridgeHandles = new Set();
  const offerSubscriptions = new Map();

  const httpSend = (obj, channelHandles) =>
    E(http).send(JSON.parse(JSON.stringify(obj)), channelHandles);

  const pushOfferSubscriptions = (channelHandle, offers) => {
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
      httpSend(
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

  const { publish: pursesPublish, subscribe: pursesSubscribe } = pubsub(E);
  const { updater: inboxUpdater, notifier: inboxNotifier } = makeNotifierKit(
    inboxState,
  );
  const { publish: inboxPublish, subscribe: inboxSubscribe } = pubsub(E);

  const notifiers = harden({
    getInboxNotifier() {
      return inboxNotifier;
    },
  });

  async function startup({ zoe, board }) {
    walletInternals = await makeWallet({
      zoe,
      board,
      pursesStateChangeHandler: pursesPublish,
      inboxStateChangeHandler: inboxPublish,
    });
  }

  const makeBridge = (approve, dappOrigin, meta = {}) => {
    async function* makeApprovedNotifier(sourceNotifier) {
      await approve();
      for await (const state of sourceNotifier) {
        await approve();
        yield state;
      }
    }

    /** @type {WalletBridge} */
    const bridge = {
      async getPursesNotifier() {
        await approve();
        const pursesNotifier = walletInternals.getPursesNotifier();
        const { notifier, updater } = makeNotifierKit(pursesState);
        observeIteration(makeApprovedNotifier(pursesNotifier), updater);
        return notifier;
      },
      async addOffer(offer) {
        await approve();
        return walletInternals.addOffer(offer, { ...meta, dappOrigin });
      },
      async getOfferNotifier(status = null) {
        await approve();
        const { notifier, updater } = makeNotifierKit(inboxState);
        const filter = offer =>
          (status === null || offer.status === status) &&
          offer.requestContext &&
          offer.requestContext.origin === dappOrigin;

        observeIteration(makeApprovedNotifier(inboxNotifier), {
          updateState(offers) {
            updater.updateState(offers.filter(filter));
          },
          finish(offers) {
            updater.finish(offers.filter(filter));
          },
          fail(e) {
            updater.fail(e);
          },
        });
        return notifier;
      },
      async getDepositFacetId(brandBoardId) {
        await approve();
        return walletInternals.getDepositFacetId(brandBoardId);
      },
      async suggestIssuer(petname, boardId) {
        await approve();
        return walletInternals.suggestIssuer(petname, boardId, dappOrigin);
      },
      async suggestInstallation(petname, boardId) {
        await approve();
        return walletInternals.suggestInstallation(
          petname,
          boardId,
          dappOrigin,
        );
      },
      async suggestInstance(petname, boardId) {
        await approve();
        return walletInternals.suggestInstance(petname, boardId, dappOrigin);
      },
    };
    return harden(bridge);
  };

  /** @type {WalletBridge} */
  const anonymousBridge = {
    addOffer(offer) {
      return walletInternals.addOffer(offer);
    },
    getDepositFacetId(brandBoardId) {
      return walletInternals.getDepositFacetId(brandBoardId);
    },
    async getOfferNotifier() {
      return inboxNotifier;
    },
    getPursesNotifier() {
      return walletInternals.getPursesNotifier();
    },
    suggestInstallation(petname, installationBoardId) {
      return walletInternals.suggestInstallation(petname, installationBoardId);
    },
    suggestInstance(petname, instanceBoardId) {
      return walletInternals.suggestInstance(petname, instanceBoardId);
    },
    suggestIssuer(petname, issuerBoardId) {
      return walletInternals.suggestIssuer(petname, issuerBoardId);
    },
  };
  harden(anonymousBridge);

  async function getWallet() {
    /** @type {WalletUser} */
    const wallet = {
      addPayment: walletInternals.addPayment,
      async getAnonymousBridge() {
        return anonymousBridge;
      },
      getDepositFacetId: walletInternals.getDepositFacetId,
      async getInternals() {
        return harden({ ...walletInternals, ...notifiers });
      },
      getIssuer: walletInternals.getIssuer,
      getIssuers: walletInternals.getIssuers,
      getPurse: walletInternals.getPurse,
      getPurses: walletInternals.getPurses,
    };
    return harden(wallet);
  }

  function setHTTPObject(o, _ROLES) {
    http = o;
  }

  function startSubscriptions() {
    // console.debug(`subscribing to walletPurseState`);
    // This provokes an immediate update
    pursesSubscribe(
      harden({
        notify(m) {
          pursesState = JSON.parse(m);
        },
      }),
    );

    // console.debug(`subscribing to walletInboxState`);
    // This provokes an immediate update
    inboxSubscribe(
      harden({
        notify(m) {
          inboxState = JSON.parse(m);
          inboxUpdater.updateState(inboxState);
          if (http) {
            // Get subscribed offers, too.
            for (const channelHandle of offerSubscriptions.keys()) {
              pushOfferSubscriptions(channelHandle, inboxState);
            }
          }
        },
      }),
    );
  }

  function getBridgeURLHandler() {
    return harden({
      // Use CapTP to interact with this object.
      async getBootstrap(otherSide, meta) {
        const dappOrigin = meta.origin;
        const suggestedDappPetname = String(
          (meta.query && meta.query.suggestedDappPetname) ||
            meta.dappOrigin ||
            dappOrigin,
        );

        const approve = async () => {
          let needApproval = false;
          await walletInternals.waitForDappApproval(
            suggestedDappPetname,
            dappOrigin,
            () => {
              needApproval = true;
              E(otherSide)
                .needDappApproval(dappOrigin, suggestedDappPetname)
                .catch(_ => {});
            },
          );
          if (needApproval) {
            E(otherSide).dappApproved(dappOrigin);
          }
        };

        return makeBridge(approve, dappOrigin, meta);
      },

      // The legacy HTTP/WebSocket handler.
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
            const {
              type,
              dappOrigin = meta.origin,
              suggestedDappPetname = (meta.query &&
                meta.query.suggestedDappPetname) ||
                obj.dappOrigin ||
                meta.origin,
            } = obj;

            // When we haven't been enabled, tell our caller.
            let needApproval = false;
            await walletInternals.waitForDappApproval(
              suggestedDappPetname,
              dappOrigin,
              () => {
                needApproval = true;
                httpSend(
                  {
                    type: 'walletNeedDappApproval',
                    data: {
                      dappOrigin,
                      suggestedDappPetname,
                    },
                  },
                  [meta.channelHandle],
                );
              },
            );
            if (needApproval) {
              httpSend(
                {
                  type: 'walletHaveDappApproval',
                  data: {
                    dappOrigin,
                  },
                },
                [meta.channelHandle],
              );
            }

            switch (type) {
              case 'walletGetPurses': {
                return {
                  type: 'walletUpdatePurses',
                  data: JSON.stringify(pursesState),
                };
              }
              case 'walletAddOffer': {
                let handled = false;
                const actions = harden({
                  result(offer, outcome) {
                    httpSend(
                      {
                        type: 'walletOfferResult',
                        data: {
                          id: offer.id,
                          dappContext: offer.dappContext,
                          outcome,
                        },
                      },
                      [meta.channelHandle],
                    );
                  },
                  error(offer, reason) {
                    httpSend(
                      {
                        type: 'walletOfferResult',
                        data: {
                          id: offer.id,
                          dappContext: offer.dappContext,
                          error: `${(reason && reason.stack) || reason}`,
                        },
                      },
                      [meta.channelHandle],
                    );
                  },
                  handled(offer) {
                    if (handled) {
                      return;
                    }
                    handled = true;
                    httpSend(
                      {
                        type: 'walletOfferHandled',
                        data: offer.id,
                      },
                      [meta.channelHandle],
                    );
                  },
                });
                return {
                  type: 'walletOfferAdded',
                  data: await walletInternals.addOffer(
                    { ...obj.data, actions },
                    { ...meta, dappOrigin },
                  ),
                };
              }

              case 'walletSubscribeOffers': {
                const { status = null } = obj;
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
                const { status = null } = obj;

                // Override the origin since we got it from the bridge.
                let result = await walletInternals.getOffers({
                  origin: dappOrigin,
                });
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
                const result = await walletInternals.getDepositFacetId(
                  brandBoardId,
                );
                return {
                  type: 'walletDepositFacetIdResponse',
                  data: result,
                };
              }

              case 'walletSuggestIssuer': {
                const { petname, boardId } = obj;
                const result = await walletInternals.suggestIssuer(
                  petname,
                  boardId,
                  dappOrigin,
                );
                return {
                  type: 'walletSuggestIssuerResponse',
                  data: result,
                };
              }

              case 'walletSuggestInstance': {
                const { petname, boardId } = obj;
                const result = await walletInternals.suggestInstance(
                  petname,
                  boardId,
                  dappOrigin,
                );
                return {
                  type: 'walletSuggestInstanceResponse',
                  data: result,
                };
              }

              case 'walletSuggestInstallation': {
                const { petname, boardId } = obj;
                const result = await walletInternals.suggestInstallation(
                  petname,
                  boardId,
                  dappOrigin,
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

  startSubscriptions();

  return harden({
    startup,
    getWallet,
    setHTTPObject,
    getBridgeURLHandler,
  });
}

// Adapter for spawner.
export default function spawn(terms, _inviteMaker) {
  const walletVat = buildRootObject();
  return walletVat.startup(terms).then(_ => walletVat);
}
