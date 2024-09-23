import { makeMarshal, decodeToJustin } from '@endo/marshal';
import { Shape as NetworkShape } from '@agoric/network';
import { M, matches } from '@endo/patterns';
import { E } from '@endo/far';
import { pickFacet } from '@agoric/vat-data';

const { toCapData } = makeMarshal(undefined, undefined, {
  marshalName: 'JustEncoder',
  serializeBodyFormat: 'capdata',
});
const just = obj => {
  const { body } = toCapData(obj);
  return decodeToJustin(JSON.parse(body), true);
};

/**
 * @import {Pattern} from '@endo/patterns';
 * @import {EVow, Remote, Vow, VowResolver, VowTools} from '@agoric/vow';
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {TargetApp, TargetRegistration} from '@agoric/vats/src/bridge-target.js';
 */

/**
 * @callback MatchEvent
 * @param {EVow<Pattern>} pattern
 * @returns {Vow<{ resolver: VowResolver<any>; match: Vow<any> }>}
 */

/**
 * @typedef {object} PacketSender
 * @property {(
 *   opts: PacketOptions,
 * ) => Vow<{ eventPattern: Pattern; resultV: Vow<any> }>} sendPacket
 */

/**
 * @typedef {object} PacketOptions
 * @property {string} [opName]
 * @property {PacketTimeout} [timeout]
 */

/**
 * @typedef {Pick<
 *   import('../cosmos-api').IBCMsgTransferOptions,
 *   'timeoutHeight' | 'timeoutTimestamp'
 * >} PacketTimeout
 */

const { Vow$ } = NetworkShape; // TODO #9611

const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

const sink = () => {};
harden(sink);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const preparePacketTools = (zone, vowTools) => {
  const { allVows, makeVowKit, watch, when } = vowTools;

  const makePacketToolsKit = zone.exoClassKit(
    'PacketToolsKit',
    {
      public: M.interface('PacketTools', {
        sendThenWaitForAck: M.call(EVow$(M.remotable('PacketSender')))
          .optional(M.any())
          .returns(EVow$(M.any())),
        matchFirstPacket: M.call(M.any()).returns(EVow$(M.any())),
        monitorTransfers: M.call(M.remotable('TargetApp')).returns(
          EVow$(M.any()),
        ),
      }),
      tap: M.interface('tap', {
        // eslint-disable-next-line no-restricted-syntax
        receiveUpcall: M.callWhen(M.any()).returns(M.any()),
      }),
      monitorRegistration: M.interface('monitorRegistration', {
        // eslint-disable-next-line no-restricted-syntax
        updateTargetApp: M.callWhen(
          M.await(M.remotable('TargetApp')),
        ).returns(),
        // eslint-disable-next-line no-restricted-syntax
        revoke: M.callWhen().returns(),
      }),
      watchPacketMatch: M.interface('watchPacketMatch', {
        onFulfilled: M.call(M.any(), M.record()).returns(M.any()),
      }),
      watchPacketPattern: M.interface('watchPacketPattern', {
        onFulfilled: M.call(M.any(), M.record()).returns(M.any()),
        onRejected: M.call(M.any(), M.record()).returns(M.any()),
      }),
      watchDecrPendingPatterns: M.interface('watchDecrPendingPatterns', {
        onFulfilled: M.call(M.any()).returns(M.any()),
        onRejected: M.call(M.any()).returns(M.any()),
      }),
      sendPacketWatcher: M.interface('sendPacketWatcher', {
        onFulfilled: M.call(
          [M.record(), M.remotable('PacketSender')],
          M.record(),
        ).returns(M.any()),
      }),
      packetWasSentWatcher: M.interface('packetWasSentWatcher', {
        onFulfilled: M.call(
          { eventPattern: M.pattern(), resultV: Vow$(M.any()) },
          M.record(),
        ).returns(M.any()),
      }),
      utils: M.interface('utils', {
        subscribeToTransfers: M.call().returns(M.promise()),
        unsubscribeFromTransfers: M.call().returns(M.undefined()),
        incrPendingPatterns: M.call().returns(Vow$(M.undefined())),
        decrPendingPatterns: M.call().returns(Vow$(M.undefined())),
      }),
      rejectResolverAndRethrowWatcher: M.interface('rejectResolverWatcher', {
        onRejected: M.call(M.any(), {
          resolver: M.remotable('resolver'),
        }).returns(M.any()),
      }),
    },
    /**
     * @param {LocalChainAccount} lca
     */
    lca => {
      const resolverToPattern = zone.detached().mapStore('resolverToPattern');
      return {
        lca,
        reg: /** @type {Remote<TargetRegistration> | null} */ (null),
        resolverToPattern,
        upcallQueue: /** @type {any[] | null} */ (null),
        pending: 0,
        extra: null,
        monitor: /** @type {Remote<TargetApp> | null} */ (null),
      };
    },
    {
      public: {
        /**
         * @param {ERef<TargetApp>} monitor
         */
        // eslint-disable-next-line no-restricted-syntax
        async monitorTransfers(monitor) {
          // We set the monitor here, but we only ever subscribe our
          // this.facets.tap handler to transfers.
          const mreg = this.facets.monitorRegistration;
          await mreg.updateTargetApp(monitor);
          return mreg;
        },
        /**
         * @type {MatchEvent}
         */
        matchFirstPacket(patternP) {
          return watch(
            this.facets.utils.incrPendingPatterns(),
            this.facets.watchPacketMatch,
            { patternP },
          );
        },
        /**
         * @param {Remote<PacketSender>} packetSender
         * @param {PacketOptions} [opts]
         * @returns {Vow<any>}
         */
        sendThenWaitForAck(packetSender, opts = {}) {
          /** @type {import('@agoric/vow').VowKit<Pattern>} */
          const pattern = makeVowKit();

          // Establish the packet matcher immediately, but don't fulfill
          // the match until after pattern.vow has been resolved.
          const matchV = watch(
            allVows([
              this.facets.public.matchFirstPacket(pattern.vow),
              packetSender,
            ]),
            this.facets.sendPacketWatcher,
            { opts },
          );

          // When the packet is sent, resolve the resultV for the reply.
          const resultV = watch(matchV, this.facets.packetWasSentWatcher, {
            opts,
            patternResolver: pattern.resolver,
          });

          // If anything fails, try to reject the packet sender.
          return watch(resultV, this.facets.rejectResolverAndRethrowWatcher, {
            resolver: pattern.resolver,
          });
        },
      },
      monitorRegistration: {
        /** @type {TargetRegistration['updateTargetApp']} */
        // eslint-disable-next-line no-restricted-syntax
        async updateTargetApp(tap) {
          this.state.monitor = await tap;
          await this.facets.utils.subscribeToTransfers();
        },
        /** @type {TargetRegistration['revoke']} */
        // eslint-disable-next-line no-restricted-syntax
        async revoke() {
          this.state.monitor = null;
        },
      },
      tap: {
        // eslint-disable-next-line no-restricted-syntax
        async receiveUpcall(obj) {
          const { monitor, resolverToPattern, upcallQueue, pending } =
            this.state;
          console.debug(
            `Trying ${resolverToPattern.getSize()} current patterns and ${pending} pending patterns against`,
            just(obj),
          );

          if (monitor) {
            // Call the monitor (if any), but in a future turn.
            void E(monitor).receiveUpcall(obj);
          }
          // Check all our fulfilled patterns for matches.
          for (const [resolver, pattern] of resolverToPattern.entries()) {
            if (matches(obj, pattern)) {
              console.debug('Matched pattern:', just(pattern));
              resolver.resolve(obj);
              resolverToPattern.delete(resolver);
              return;
            }
          }
          if (upcallQueue) {
            // We have some pending patterns (ones that have been requested but
            // haven't yet settled) that may match this object.
            console.debug('Stashing object in upcallQueue');
            this.state.upcallQueue = harden(upcallQueue.concat(obj));
          }
          console.debug('No match yet.');
        },
      },
      sendPacketWatcher: {
        onFulfilled([{ match }, sender], ctx) {
          return watch(E(sender).sendPacket(match, ctx.opts));
        },
      },
      packetWasSentWatcher: {
        onFulfilled({ eventPattern, resultV }, ctx) {
          const { patternResolver } = ctx;
          patternResolver.resolve(eventPattern);
          return resultV;
        },
      },
      rejectResolverAndRethrowWatcher: {
        onRejected(rej, { resolver }) {
          resolver.reject(rej);
          throw rej;
        },
      },
      watchPacketMatch: {
        onFulfilled(_, { patternP }) {
          const { vow, resolver } = makeVowKit();
          const patternV = watch(
            patternP,
            this.facets.watchPacketPattern,
            harden({ resolver }),
          );
          /* void */ watch(patternV, this.facets.watchDecrPendingPatterns);
          return harden({ match: vow, resolver });
        },
      },
      watchDecrPendingPatterns: {
        onFulfilled() {
          return this.facets.utils.decrPendingPatterns();
        },
        onRejected() {
          return this.facets.utils.decrPendingPatterns();
        },
      },
      watchPacketPattern: {
        onFulfilled(pattern, { resolver }) {
          const { resolverToPattern, upcallQueue } = this.state;

          console.debug('watchPacketPattern onFulfilled', just(pattern));
          if (!upcallQueue) {
            // Save the pattern for later.
            console.debug('No upcall queue yet.  Save the pattern for later.');
            resolverToPattern.init(resolver, pattern);
            return;
          }

          // Try matching the first in queue.
          const i = upcallQueue.findIndex(obj => matches(obj, pattern));
          if (i < 0) {
            // No match yet. Save the pattern for later.
            console.debug('No match yet. Save the pattern for later.');
            resolverToPattern.init(resolver, pattern);
            return;
          }

          // Success! Remove the matched object from the queue.
          console.debug(
            'Success! Remove the matched object from the queue.',
            just(upcallQueue[i]),
          );
          resolver.resolve(upcallQueue[i]);
          this.state.upcallQueue = harden(
            upcallQueue.slice(0, i).concat(upcallQueue.slice(i + 1)),
          );
        },
        onRejected(reason, { resolver }) {
          resolver.reject(reason);
        },
      },

      utils: {
        incrPendingPatterns() {
          const { pending, reg, upcallQueue } = this.state;
          this.state.pending += 1;
          if (!upcallQueue) {
            this.state.upcallQueue = harden([]);
          }
          if (reg || pending > 0) {
            return watch(undefined);
          }
          return watch(this.facets.utils.subscribeToTransfers());
        },
        decrPendingPatterns() {
          this.state.pending -= 1;
          if (this.state.pending > 0) {
            return;
          }
          this.state.pending = 0;
          this.state.upcallQueue = null;
          // FIXME when it returns undefined this causes an error:
          // In "unsubscribeFromTransfers" method of (PacketToolsKit utils): result: undefined "[undefined]" - Must be a promise
          return watch(this.facets.utils.unsubscribeFromTransfers());
        },
        subscribeToTransfers() {
          // Subscribe to the transfers for this account.
          const { lca, reg } = this.state;
          if (reg) {
            return when(reg);
          }
          const { tap } = this.facets;
          // XXX racy; fails if subscribeToTransfers is called while this promise is in flight
          // e.g. 'Target "agoric1fakeLCAAddress" already registered'
          return when(E(lca).monitorTransfers(tap), r => {
            this.state.reg = r;
            return r;
          });
        },
        unsubscribeFromTransfers() {
          const { reg, monitor } = this.state;
          if (!reg || monitor) {
            return undefined;
          }
          // this.state.reg = null;
          // return E(reg).revoke().then(sink);
        },
      },
    },
    {
      finish(context) {
        void context.facets.utils.subscribeToTransfers();
      },
    },
  );

  const makePacketTools = pickFacet(makePacketToolsKit, 'public');
  return makePacketTools;
};
harden(preparePacketTools);

/**
 * @typedef {Awaited<ReturnType<ReturnType<typeof preparePacketTools>>>} PacketTools
 */
