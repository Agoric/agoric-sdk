// @ts-check
import { Fail, b } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal/src/action-types.js';
import { coerceToByteSource, byteSourceToBase64 } from '@agoric/network';
import { TargetAppI, AppTransformerI } from './bridge-target.js';

/**
 * @import {TargetApp, TargetHost} from './bridge-target.js'
 * @import {VTransferIBCEvent} from './types.js';
 */

/**
 * The least possibly restrictive guard for a `watch` watcher's `onFulfilled` or
 * `onRejected` reaction
 */
const ReactionGuard = M.call(M.any()).optional(M.any()).returns(M.any());

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 */
const prepareTransferInterceptor = (zone, vowTools) => {
  const { watch } = vowTools;
  const makeTransferInterceptorKit = zone.exoClassKit(
    'TransferInterceptorKit',
    {
      public: TargetAppI,
      ackSender: M.interface('AckSender', {
        onFulfilled: ReactionGuard,
      }),
      nackSender: M.interface('NackSender', {
        onRejected: ReactionGuard,
      }),
      errorLogger: M.interface('ErrorLogger', {
        onRejected: ReactionGuard,
      }),
    },
    /**
     * @param {ERef<TargetApp>} tap
     * @param {ERef<TargetHost>} targetHost
     * @param {boolean} [isActiveTap] Whether the tap is active (can modify
     *   acknowledgements), or passive (can't cause delays in the middleware).
     */
    (tap, targetHost, isActiveTap = false) => ({
      isActiveTap,
      tap,
      targetHost,
    }),
    {
      public: {
        /** @param {VTransferIBCEvent} obj */
        async receiveUpcall(obj) {
          const { isActiveTap, tap } = this.state;

          obj.type === VTRANSFER_IBC_EVENT ||
            Fail`Invalid upcall argument type ${obj.type}; expected ${b(VTRANSFER_IBC_EVENT)}`;

          // First, call our target contract listener.
          // A VTransfer active interceptor can return a write acknowledgement
          /** @type {import('@agoric/vow').Vow<unknown>} */
          let retP = watch(E(tap).receiveUpcall(obj));

          // See if the upcall result needs special handling.
          if (obj.event === 'writeAcknowledgement') {
            // Respond with the ack (or an active tap's replacement thereof).
            const response = {
              type: 'IBC_METHOD',
              method: 'receiveExecuted',
              packet: obj.packet,
              ack: obj.acknowledgement,
            };
            const senderContext = { response, isActiveTap };
            // An active tap must wait for the upcall result,
            // but a passive tap can proceed immediately.
            retP = isActiveTap
              ? watch(retP, this.facets.ackSender, senderContext)
              : /** @type {any} */ (
                  E(this.facets.ackSender).onFulfilled(undefined, senderContext)
                );
            // Upon failure, respond with an error acknowledgement.
            retP = watch(retP, this.facets.nackSender, { response });
          }

          // Always log errors.
          retP = watch(retP, this.facets.errorLogger, { obj });

          // For an active tap, return a promise/vow to delay middleware
          // until final settlement.
          // For a passive tap, return undefined to skip such delays.
          return isActiveTap ? retP : undefined;
        },
      },
      /**
       * A watcher for sending acknowledgements down to the host.
       */
      ackSender: {
        onFulfilled(rawAck, { response, isActiveTap }) {
          if (isActiveTap) {
            // Incorporate an active tap's replacement ack.
            const ack = byteSourceToBase64(coerceToByteSource(rawAck));
            response = { ...response, ack };
          }
          return E(this.state.targetHost).sendDowncall(response);
        },
      },

      /**
       * A watcher for sending error acknowledgements down to the host.
       */
      nackSender: {
        onRejected(error, { response }) {
          console.error(`Error sending ack:`, error);
          const rawAck = JSON.stringify({ error: error.message });
          const nack = { ...response, ack: byteSourceToBase64(rawAck) };
          return E(this.state.targetHost).sendDowncall(nack);
        },
      },

      /**
       * A watcher for logging errors.
       */
      errorLogger: {
        onRejected(error, { obj }) {
          console.error(`Error in handling of`, obj, error);
          // Don't propagate the error any further.
        },
      },
    },
  );

  /**
   * A TransferInterceptor wraps a TargetApp that is specialized for handling
   * asynchronous callbacks from the IBC transfer protocol as implemented by
   * `x/vtransfer`. By using this interceptor, the TargetApp is prevented from
   * sending messages which may violate the transfer protocol directly to the
   * `targetHost`.
   *
   * @param {Parameters<typeof makeTransferInterceptorKit>} args
   */
  const makeTransferInterceptor = (...args) =>
    makeTransferInterceptorKit(...args).public;
  return makeTransferInterceptor;
};
harden(prepareTransferInterceptor);

const TransferMiddlewareKitFinisherI = M.interface(
  'TransferMiddlewareKitFinisher',
  {
    useRegistry: M.call(M.remotable('TargetRegistry')).returns(),
  },
);

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
 * @callback RegisterTap
 * @param {string} target String identifying the bridge target.
 * @param {ERef<import('./bridge-target.js').TargetApp>} tap The "application
 *   tap" to register for the target.
 */

/**
 * A TransferMiddlewareKit has a `transferMiddleware` facet with methods for
 * registering and unregistering active and passive "taps" in a BridgeTargetKit
 * registry that must use the `interceptorFactory` facet as its appTransfomer to
 * enforce IBC transfer protocol conformance. Before registering any taps, the
 * backing BridgeTargetKit must be set with the `finisher` facet (i.e., the
 * expected setup pattern is to pass in `interceptorFactory` as the
 * appTransformer argument when making a BridgeTargetKit and then to invoke
 * `finisher.useRegistry` with the `targetRegistry` of that BridgeTargetKit
 * before making further use of the TransferMiddlewareKit or connecting the
 * BridgeTargetKit to a bridge).
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareTransferInterceptor>} makeTransferInterceptor
 */
const prepareTransferMiddlewareKit = (zone, makeTransferInterceptor) =>
  zone.exoClassKit(
    'TransferMiddlewareKit',
    {
      finisher: TransferMiddlewareKitFinisherI,
      interceptorFactory: AppTransformerI,
      transferMiddleware: TransferMiddlewareI,
    },
    () => ({
      /** @type {import('./bridge-target').TargetRegistry | undefined} */
      targetRegistry: undefined,
    }),
    {
      finisher: {
        /**
         * @param {import('./bridge-target').TargetRegistry} registry
         */
        useRegistry(registry) {
          this.state.targetRegistry = registry;
        },
      },
      interceptorFactory: {
        wrapApp: makeTransferInterceptor,
      },
      transferMiddleware: {
        /**
         * Register a tap to intercept the vtransfer target account address
         * messages, without granting that tap the ability to delay or interfere
         * with the underlying IBC transfer protocol.
         *
         * @type {RegisterTap}
         */
        async registerTap(target, tap) {
          const { targetRegistry } = this.state;
          if (!targetRegistry) throw Fail`Registry not initialized`;
          return E(targetRegistry).register(target, tap, []);
        },
        /**
         * Similar to `registerTap`, but allows the tap to inject async
         * acknowledgements in the IBC transfer protocol.
         *
         * @type {RegisterTap}
         */
        async registerActiveTap(target, tap) {
          const { targetRegistry } = this.state;
          if (!targetRegistry) throw Fail`Registry not initialized`;
          return E(targetRegistry).register(target, tap, [true]);
        },
        /**
         * Unregister the target.
         *
         * @param {string} target String identifying the bridge target to stop
         *   tapping.
         */
        async unregisterTap(target) {
          const { targetRegistry } = this.state;
          if (!targetRegistry) throw Fail`Registry not initialized`;
          await E(targetRegistry).unregister(target);
        },
      },
    },
  );
/** @typedef {ReturnType<ReturnType<typeof prepareTransferMiddlewareKit>>} TransferMiddlewareKit */
/** @typedef {TransferMiddlewareKit['transferMiddleware']} TransferMiddleware */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 */
export const prepareTransferTools = (zone, vowTools) => {
  const makeTransferInterceptor = prepareTransferInterceptor(zone, vowTools);
  const makeTransferMiddlewareKit = prepareTransferMiddlewareKit(
    zone,
    makeTransferInterceptor,
  );
  return harden({ makeTransferMiddlewareKit });
};
harden(prepareTransferTools);
