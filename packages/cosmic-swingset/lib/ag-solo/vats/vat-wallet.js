import harden from '@agoric/harden';
import { makeWallet } from './lib-wallet';
import pubsub from './pubsub';

function build(E, D, _log) {
  let wallet;
  let pursesState;
  let inboxState;
  let commandDevice;

  const { publish: pursesPublish, subscribe: purseSubscribe } = pubsub(E);
  const { publish: inboxPublish, subscribe: inboxSubscribe } = pubsub(E);

  async function startup(zoe, registrar) {
    wallet = await makeWallet(E, zoe, registrar, pursesPublish, inboxPublish);
  }

  async function getWallet() {
    return harden(wallet);
  }

  function setCommandDevice(d, _ROLES) {
    commandDevice = d;
  }

  function getCommandHandler() {
    return {
      async processInbound(obj) {
        const { type, data, requestContext } = obj;
        switch (type) {
          case 'walletGetPurses': {
            if (!pursesState) return {};
            return {
              type: 'walletUpdatePurses',
              data: pursesState,
            };
          }
          case 'walletGetInbox': {
            if (!inboxState) return {};
            return {
              type: 'walletUpdateInbox',
              data: inboxState,
            };
          }
          case 'walletAddOffer': {
            // We only need to do this because we can't reach addOffer.
            const hooks = wallet.hydrateHooks(data.hooks);
            return {
              type: 'walletOfferAdded',
              data: await wallet.addOffer(data, hooks, requestContext),
            };
          }
          case 'walletDeclineOffer': {
            return {
              type: 'walletOfferDeclined',
              data: wallet.declineOffer(data),
            };
          }
          case 'walletCancelOffer': {
            return {
              type: 'walletOfferCancelled',
              data: wallet.cancelOffer(data),
            };
          }
          case 'walletAcceptOffer': {
            await wallet.acceptOffer(data);
            return {
              type: 'walletOfferAccepted',
              data: true,
            };
          }
          case 'walletGetOfferDescriptions': {
            const result = await wallet.getOfferDescriptions(data);
            return {
              type: 'walletOfferDescriptions',
              data: result,
            };
          }

          default: {
            return false;
          }
        }
      },
    };
  }

  function setPresences() {
    console.log(`subscribing to walletPurseState`);
    // This provokes an immediate update
    purseSubscribe(
      harden({
        notify(m) {
          pursesState = m;
          if (commandDevice) {
            D(commandDevice).sendBroadcast({
              type: 'walletUpdatePurses',
              data: pursesState,
            });
          }
        },
      }),
    );

    console.log(`subscribing to walletInboxState`);
    // This provokes an immediate update
    inboxSubscribe(
      harden({
        notify(m) {
          inboxState = m;
          if (commandDevice) {
            D(commandDevice).sendBroadcast({
              type: 'walletUpdateInbox',
              data: inboxState,
            });
          }
        },
      }),
    );
  }

  return harden({
    startup,
    getWallet,
    setCommandDevice,
    getCommandHandler,
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
