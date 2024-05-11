// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { coerceToByteSource, byteSourceToBase64 } from '@agoric/network';
import { TargetAppI } from './bridge-target.js';

/**
 * @import {TargetApp, TargetHost} from './bridge-target.js'
 * @import {PureData} from '@endo/pass-style'
 */

const { Fail } = assert;

const ReactionGuard = M.call(M.any()).optional(M.any()).returns(M.any());

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 */
export const prepareTransferInterceptor = (zone, vowTools) => {
  const { watch } = vowTools;
  const makeTransferInterceptorKit = zone.exoClassKit(
    'TransferInterceptorKit',
    {
      public: TargetAppI,
      encodeAckWatcher: M.interface('EncodeAckWatcher', {
        onFulfilled: ReactionGuard,
      }),
      sendErrorWatcher: M.interface('SendErrorWatcher', {
        onRejected: ReactionGuard,
      }),
      logErrorWatcher: M.interface('LogErrorWatcher', {
        onRejected: ReactionGuard,
      }),
    },
    /**
     * @param {ERef<TargetHost>} targetHost
     * @param {ERef<TargetApp>} tap
     * @param {boolean} [isActiveTap] Whether the tap is active (can modify
     *   acknowledgements), or passive (can't cause delays in the middleware).
     */
    (targetHost, tap, isActiveTap = false) => ({
      isActiveTap,
      targetHost,
      tap,
    }),
    {
      public: {
        async upcall(obj) {
          const { isActiveTap, targetHost, tap } = this.state;

          obj.type === 'VTRANSFER_IBC_EVENT' ||
            Fail`Invalid upcall argument type ${obj.type}; expected VTRANSFER_IBC_EVENT`;

          // First, call our target contract listener.
          // A VTransfer active interceptor can return a write acknowledgement
          /** @type {import('@agoric/vow').Vow<PureData>} */
          let retP = watch(E(tap).upcall(obj));

          // See if the upcall result needs special handling.
          if (obj.event === 'writeAcknowledgement') {
            const ackMethodData = {
              type: 'IBC_METHOD',
              method: 'receiveExecuted',
              packet: obj.packet,
            };
            if (isActiveTap) {
              retP = watch(retP, this.facets.encodeAckWatcher, {
                ackMethodData,
              });
            } else {
              // This is a passive tap, so forward the ack without intervention.
              ackMethodData.ack = obj.acknowledgement;
              retP = watch(E(targetHost).downcall(ackMethodData));
            }
            retP = watch(retP, this.facets.sendErrorWatcher, { ackMethodData });
          }

          // Log errors in the upcall handling.
          retP = watch(retP, this.facets.logErrorWatcher, { obj });

          if (isActiveTap) {
            // If the tap is active, return the promiseVow to the caller.  This
            // will delay the middleware until fulfilment of the retP chain.
            return retP;
          }

          // Otherwise, passively return nothing.
        },
      },
      /**
       * `watch` callback for encoding the raw `ack` return value from an active
       * `writeAcknowledgement` tap as base64, then sending down to the
       * targetHost.
       */
      encodeAckWatcher: {
        onFulfilled(rawAck, { ackMethodData }) {
          // Encode the tap's ack and write it out.
          const ack = byteSourceToBase64(coerceToByteSource(rawAck));
          ackMethodData = { ...ackMethodData, ack };
          return E(this.state.targetHost).downcall(ackMethodData);
        },
      },
      /**
       * `watch` callback for handling errors in the sending of an ack and
       * reifying it as an error acknowledgement.
       */
      sendErrorWatcher: {
        onRejected(error, { ackMethodData }) {
          console.error(`Error sending ack:`, error);
          const rawAck = JSON.stringify({ error: error.message });
          ackMethodData = { ...ackMethodData, ack: byteSourceToBase64(rawAck) };
          return E(this.state.targetHost).downcall(ackMethodData);
        },
      },
      /** `watch` callback for logging errors in the upcall handling. */
      logErrorWatcher: {
        onRejected(error, { obj }) {
          console.error(`Error in handling of`, obj, error);
        },
      },
    },
  );

  /** @param {Parameters<typeof makeTransferInterceptorKit>} args */
  const makeTransferInterceptor = (...args) =>
    makeTransferInterceptorKit(...args).public;
  return makeTransferInterceptor;
};
harden(prepareTransferInterceptor);

const TransferMiddlewareI = M.interface('TransferMiddleware', {
  registerTap: M.callWhen(
    M.string(),
    M.remotable('TransferInterceptor'),
  ).returns(M.remotable('TargetRegistration')),
  registerActiveTap: M.callWhen(
    M.string(),
    M.remotable('TransferInterceptor'),
  ).returns(M.remotable('TargetRegistration')),
  unregisterTap: M.callWhen(M.string()).returns(),
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
     * @param {ERef<import('./bridge-target.js').TargetHost>} targetHost
     * @param {ERef<import('./bridge-target.js').TargetRegistry>} targetRegistry
     */
    (targetHost, targetRegistry) => ({ targetHost, targetRegistry }),
    {
      /**
       * @param {string} target String identifying the bridge target.
       * @param {ERef<import('./bridge-target.js').TargetApp>} tap The
       *   "application tap" to register for the target.
       */
      async registerTap(target, tap) {
        const { targetHost, targetRegistry } = this.state;

        // Wrap the tap so that its upcall results determine how to contact the
        // targetHost.  Never allow the tap to send to the targetHost directly.
        const interceptor = makeTransferInterceptor(targetHost, tap);
        return E(targetRegistry).register(target, interceptor);
      },
      async registerActiveTap(target, tap) {
        const { targetHost, targetRegistry } = this.state;

        // Wrap the tap and allow it to modify async acknowledgements.  Never
        // allow the tap to send to the targetHost directly.
        const interceptor = makeTransferInterceptor(targetHost, tap, true);
        return E(targetRegistry).register(target, interceptor);
      },
      /**
       * Unregister the target.
       *
       * @param {string} target String identifying the bridge target to stop
       *   tapping.
       */
      async unregisterTap(target) {
        const { targetRegistry } = this.state;
        await E(targetRegistry).unregister(target);
      },
    },
  );
/** @typedef {ReturnType<ReturnType<typeof prepareTransferMiddleware>>} TransferMiddleware */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 */
export const prepareTransferTools = (zone, vowTools) => {
  const makeTransferInterceptor = prepareTransferInterceptor(zone, vowTools);
  const makeTransferMiddleware = prepareTransferMiddleware(
    zone,
    makeTransferInterceptor,
  );

  return harden({ makeTransferMiddleware });
};
harden(prepareTransferTools);
