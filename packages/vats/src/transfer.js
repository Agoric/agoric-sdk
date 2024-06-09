// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal';
import { coerceToByteSource, byteSourceToBase64 } from '@agoric/network';
import {
  prepareBridgeTargetModule,
  TargetAppI,
  AppTransformerI,
} from './bridge-target.js';

/**
 * @import {TargetApp, TargetHost} from './bridge-target.js'
 */

const { Fail, bare } = assert;

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
        async receiveUpcall(obj) {
          const { isActiveTap, tap, targetHost } = this.state;

          obj.type === VTRANSFER_IBC_EVENT ||
            Fail`Invalid upcall argument type ${obj.type}; expected ${bare(VTRANSFER_IBC_EVENT)}`;

          // First, call our target contract listener.
          // A VTransfer active interceptor can return a write acknowledgement
          /** @type {import('@agoric/vow').Vow<unknown>} */
          let retP = watch(E(tap).receiveUpcall(obj));

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
              retP = watch(E(targetHost).sendDowncall(ackMethodData));
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
          return E(this.state.targetHost).sendDowncall(ackMethodData);
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
          return E(this.state.targetHost).sendDowncall(ackMethodData);
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
  const { makeBridgeTargetKit } = prepareBridgeTargetModule(
    zone.subZone('bridge-target'),
  );

  const makeTransferMiddlewareKit = prepareTransferMiddlewareKit(
    zone,
    makeTransferInterceptor,
  );

  return harden({ makeTransferMiddlewareKit, makeBridgeTargetKit });
};
harden(prepareTransferTools);
