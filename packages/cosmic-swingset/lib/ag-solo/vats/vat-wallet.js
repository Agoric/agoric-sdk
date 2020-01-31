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
        const { type, data } = obj;
        if (type === 'walletGetPurses') {
          if (pursesState) {
            return {
              type: 'walletUpdatePurses',
              data: pursesState,
            };
          }
          return {};
        }

        if (type === 'walletGetInbox') {
          if (inboxState) {
            return {
              type: 'walletUpdateInbox',
              data: inboxState,
            };
          }
          return {};
        }

        if (type === 'walletAddOffer') {
          const result = wallet.addOffer(data);
          return {
            type: 'walletOfferAdded',
            data: result,
          };
        }

        if (type === 'walletDeclineOffer') {
          const result = wallet.declineOffer(data);
          return {
            type: 'walletOfferDeclineed',
            data: result,
          };
        }

        if (type === 'walletAcceptOffer') {
          const result = await wallet.acceptOffer(data);
          return {
            type: 'walletOfferAccepted',
            data: result,
          };
        }

        return false;
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
