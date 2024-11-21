import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { getInterfaceGuardPayload } from '@endo/patterns';
import { M } from '@agoric/store';
import { PowerFlags } from './walletFlags.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { BridgeHandlerI } from './bridge.js';

const BridgeHandlerAdjustedI = M.interface('BridgeHandlerTest', {
  ...getInterfaceGuardPayload(BridgeHandlerI).methodGuards
});

/**
 * @param {import('@agoric/store').MapStore} baggage
 */
export const prepareProvisionBridgeHandler = baggage => {
  const zone = makeDurableZone(baggage);
  const makeProvisionBridgeHandler = zone.exoClass(
    'provisioningHandlerDurable',
    BridgeHandlerAdjustedI,
    (provisioning, provisionWalletBridgeManager) => ({
      provisioning,
      provisionWalletBridgeManager,
    }),
    {
      async fromBridge(obj) {
        const { provisionWalletBridgeManager, provisioning } = this.state;
        switch (obj && obj.type) {
          case 'PLEASE_PROVISION': {
            const { nickname, address, powerFlags: rawPowerFlags } = obj;
            const powerFlags = rawPowerFlags || [];
            let provisionP;
            if (powerFlags.includes(PowerFlags.SMART_WALLET)) {
              // Only provision a smart wallet.
              provisionP = E(provisionWalletBridgeManager).fromBridge(obj);
            } else {
              // Provision a mailbox and REPL.
              provisionP = E(provisioning).pleaseProvision(
                nickname,
                address,
                powerFlags,
              );
            }
            return provisionP
              .catch(e =>
                console.error(`Error provisioning ${nickname} ${address}:`, e),
              )
              .then(_ => {});
          }
          default: {
            throw Fail`Unrecognized request ${obj.type}`;
          }
        }
      },
    },
  );

  return makeProvisionBridgeHandler;
};
