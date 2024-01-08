// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { btoa } from '@endo/base64';
import { AppI } from './bridge-target.js';

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareTransferInterceptor = zone =>
  zone.exoClass(
    'TransferInterceptor',
    AppI,
    /**
     * @param {ERef<import('./bridge-target.js').System>} system
     * @param {ERef<import('./bridge-target.js').App>} tap
     */
    (system, tap) => ({ system, tap }),
    {
      async upcall(obj) {
        const { system, tap } = this.state;
        const { type } = obj;

        // First, call our target contract listener.
        let retP = E(tap).upcall(obj);

        // See if the upcall result needs special handling.
        if (
          type === 'VTRANSFER_IBC_EVENT' &&
          obj.event === 'writeAcknowledgement'
        ) {
          // Allow the upcall result to trigger an ack.
          const ackMethod = {
            type: 'IBC_METHOD',
            method: 'receiveExecuted',
            packet: obj.packet,
          };
          // FIXME: use the Whenable `watch` operator.
          retP = retP
            .then(rawAck => {
              if (rawAck === undefined) {
                // No ack to send.
                return;
              }
              // Write out the encoded ack.
              ackMethod.ack = btoa(rawAck);
              return E(system).downcall(ackMethod);
            })
            .catch(error => {
              console.error(`Error sending ack:`, error);
              const rawAck = JSON.stringify({ error: error.message });
              ackMethod.ack = btoa(rawAck);
              return E(system).downcall(ackMethod);
            });
        }

        // Log errors in the upcall handling.
        retP.catch(error => {
          console.error(`Error in handling of`, obj, error);
        });
      },
    },
  );
harden(prepareTransferInterceptor);

const TransferMiddlewareI = M.interface('TransferMiddleware', {
  intercept: M.callWhen(
    M.remotable('System'),
    M.remotable('TargetRegistry'),
  ).returns(M.remotable('TransferInterceptor')),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareTransferInterceptor>} makeTransferInterceptor
 */
const prepareTransferMiddleware = (zone, makeTransferInterceptor) =>
  zone.exoClass(
    'TransferMiddleware',
    TransferMiddlewareI,
    /**
     * @param {ERef<import('./bridge-target.js').System>} system
     * @param {ERef<import('./bridge-target.js').TargetRegistry>} targetRegistry
     */
    (system, targetRegistry) => ({ system, targetRegistry }),
    {
      /**
       * @param {string} target
       * @param {ERef<import('./bridge-target.js').App>} tap
       */
      async intercept(target, tap) {
        const { system, targetRegistry } = this.state;
        // Wrap the tap so that its upcall results determine how to contact the
        // system.  Never allow the tap to send to the system directly.
        const interceptor = makeTransferInterceptor(system, tap);
        return E(targetRegistry).register(target, interceptor);
      },
    },
  );

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareTransferTools = zone => {
  const makeTransferInterceptor = prepareTransferInterceptor(zone);
  const makeTransferMiddleware = prepareTransferMiddleware(
    zone,
    makeTransferInterceptor,
  );

  return harden({ makeTransferMiddleware });
};
harden(prepareTransferTools);
