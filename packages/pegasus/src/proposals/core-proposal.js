// @ts-check
import { E, Far } from '@endo/far';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { observeIteration, subscribeEach } from '@agoric/notifier';

/**
 * @import {Connection, Port, PortAllocator} from '@agoric/network';
 */

export const CONTRACT_NAME = 'Pegasus';

const t = 'pegasus';

export const getManifestForPegasus = ({ restoreRef }, { pegasusRef }) => ({
  manifest: {
    startPegasus: {
      consume: { board: t, namesByAddress: t, zoe: t },
      installation: {
        consume: { [CONTRACT_NAME]: t },
      },
      instance: {
        produce: { [CONTRACT_NAME]: t },
      },
    },
    listenPegasus: {
      consume: { portAllocator: t, pegasusConnectionsAdmin: t, zoe: t },
      produce: { pegasusConnections: t, pegasusConnectionsAdmin: t },
      instance: {
        consume: { [CONTRACT_NAME]: t },
      },
    },
  },
  installations: {
    [CONTRACT_NAME]: restoreRef(pegasusRef),
  },
});

export const startPegasus = async ({
  consume: { board: boardP, namesByAddress: namesByAddressP, zoe },
  installation: {
    consume: { [CONTRACT_NAME]: pegasusInstall },
  },
  instance: {
    produce: { [CONTRACT_NAME]: produceInstance },
  },
}) => {
  const [board, namesByAddress] = await Promise.all([boardP, namesByAddressP]);
  const privates = { board, namesByAddress };

  const { instance } = await E(zoe).startInstance(
    pegasusInstall,
    undefined,
    undefined,
    privates,
  );

  produceInstance.resolve(instance);
};
harden(startPegasus);

/**
 * @param {Port} port
 * @param {*} pegasus
 * @param {import('@agoric/vats').NameAdmin} pegasusConnectionsAdmin
 */
export const addPegasusTransferPort = async (
  port,
  pegasus,
  pegasusConnectionsAdmin,
) => {
  const { handler, subscription } = await E(pegasus).makePegasusConnectionKit();
  observeIteration(subscribeEach(subscription), {
    updateState(connectionState) {
      const { localAddr, actions } = connectionState;
      if (actions) {
        // We're open and ready for business.
        void E(pegasusConnectionsAdmin).update(localAddr, connectionState);
      } else {
        // We're closed.
        void E(pegasusConnectionsAdmin).delete(localAddr);
      }
    },
  }).catch(err =>
    console.error('Error observing Pegasus connection kit:', err),
  );
  return E(port).addListener(
    Far('listener', {
      async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
        return handler;
      },
      async onListen(p, _listenHandler) {
        console.debug(`Listening on Pegasus transfer port: ${p}`);
      },
    }),
  );
};
harden(addPegasusTransferPort);

export const listenPegasus = async ({
  consume: { portAllocator, pegasusConnectionsAdmin: pegasusNameAdmin, zoe },
  produce: { pegasusConnections, pegasusConnectionsAdmin },
  instance: {
    consume: { [CONTRACT_NAME]: pegasusInstance },
  },
}) => {
  const { nameHub, nameAdmin } = makeNameHubKit();
  pegasusConnections.resolve(nameHub);
  pegasusConnectionsAdmin.resolve(nameAdmin);

  const pegasus = await E(zoe).getPublicFacet(pegasusInstance);
  const port = await E(portAllocator).allocateCustomIBCPort('pegasus');
  return addPegasusTransferPort(port, pegasus, pegasusNameAdmin);
};
harden(listenPegasus);
