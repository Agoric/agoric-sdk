import { assertAllDefined } from '@agoric/internal';
import { makeMarshal, decodeToJustin } from '@endo/marshal';
import {
  base64ToBytes,
  byteSourceToBase64,
  Shape as NetworkShape,
} from '@agoric/network';
import { M, matches } from '@endo/patterns';
import { E } from '@endo/far';
import { pickFacet } from '@agoric/vat-data';

// As specified in ICS20, the success result is a base64-encoded '\0x1' byte.
export const ICS20_TRANSFER_SUCCESS_RESULT = 'AQ==';

const { toCapData } = makeMarshal(undefined, undefined, {
  marshalName: 'JustEncoder',
  serializeBodyFormat: 'capdata',
});
const just = obj => {
  const { body } = toCapData(obj);
  return decodeToJustin(JSON.parse(body), true);
};

/**
 * @import {Bytes} from '@agoric/network';
 * @import {EVow, Remote, Vow, VowResolver, VowTools} from '@agoric/vow';
 * @import {JsonSafe, TypedJson, ResponseTo} from '@agoric/cosmic-proto';
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
 * @property {(opts: PacketOptions) => Vow<Pattern>} sendPacket
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

const { Fail, bare } = assert;
const { Vow$ } = NetworkShape; // TODO #9611

const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

const sink = () => {};
harden(sink);

/**
 * Create a pattern for alterative representations of a sequence number.
 *
 * @param {any} sequence
 * @returns {import('@endo/patterns').Pattern}
 */
const createSequencePattern = sequence => {
  const sequencePatterns = [];

  try {
    const bintSequence = BigInt(sequence);
    bintSequence > 0n && sequencePatterns.push(bintSequence);
  } catch (e) {
    // ignore
  }

  const numSequence = Number(sequence);
  numSequence > 0 &&
    Number.isSafeInteger(numSequence) &&
    sequencePatterns.push(numSequence);

  const strSequence = String(sequence);
  strSequence && sequencePatterns.push(strSequence);

  if (!sequencePatterns.find(seq => seq === sequence)) {
    sequencePatterns.push(sequence);
  }

  switch (sequencePatterns.length) {
    case 0:
      throw Fail`sequence ${sequence} is not valid`;
    case 1:
      return sequencePatterns[0];
    default:
      return M.or(...sequencePatterns);
  }
};
harden(createSequencePattern);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareTransferSender = (zone, { watch }) => {
  const makeTransferSenderKit = zone.exoClassKit(
    'TransferSenderKit',
    {
      public: M.interface('TransferSender', {
        sendPacket: M.call(M.any()).returns(Vow$(M.record())),
      }),
      responseWatcher: M.interface('responseWatcher', {
        onFulfilled: M.call([M.record()]).returns(M.any()),
      }),
    },
    /**
     * @param {{
     *   executeTx: LocalChainAccount['executeTx'];
     * }} txExecutor
     * @param {TypedJson<'/ibc.applications.transfer.v1.MsgTransfer'>} transferMsg
     */
    (txExecutor, transferMsg) => ({
      txExecutor,
      transferMsg: harden(transferMsg),
    }),
    {
      public: {
        sendPacket() {
          const { txExecutor, transferMsg } = this.state;
          return watch(
            E(txExecutor).executeTx([transferMsg]),
            this.facets.responseWatcher,
          );
        },
      },
      responseWatcher: {
        /**
         * Wait for successfully sending the transfer packet.
         *
         * @param {[
         *   JsonSafe<
         *     ResponseTo<
         *       TypedJson<'/ibc.applications.transfer.v1.MsgTransfer'>
         *     >
         *   >,
         * ]} response
         */
        onFulfilled([{ sequence }]) {
          const { transferMsg } = this.state;

          // Match the port/channel and sequence number.
          return M.splitRecord({
            source_port: transferMsg.sourcePort,
            source_channel: transferMsg.sourceChannel,
            sequence: createSequencePattern(sequence),
          });
        },
      },
    },
  );

  /**
   * @param {Parameters<typeof makeTransferSenderKit>} args
   */
  return (...args) => makeTransferSenderKit(...args).public;
};
harden(prepareTransferSender);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const preparePacketTools = (zone, vowTools) => {
  const { allVows, makeVowKit, watch, when } = vowTools;
  const makeTransferSender = prepareTransferSender(zone, vowTools);
  const makePacketToolsKit = zone.exoClassKit(
    'PacketToolsKit',
    {
      public: M.interface('PacketTools', {
        waitForIBCAck: M.call(EVow$(M.remotable('PacketSender')))
          .optional(M.any())
          .returns(EVow$(M.string())),
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
      utils: M.interface('utils', {
        subscribeToTransfers: M.call().returns(M.promise()),
        unsubscribeFromTransfers: M.call().returns(M.promise()),
        incrPendingPatterns: M.call().returns(Vow$(M.undefined())),
        decrPendingPatterns: M.call().returns(Vow$(M.undefined())),
      }),
      packetWasSentWatcher: M.interface('packetWasSentWatcher', {
        onFulfilled: M.call(M.pattern(), M.record()).returns(M.any()),
      }),
      processIBCReplyWatcher: M.interface('processIBCReplyWatcher', {
        onFulfilled: M.call(M.record(), M.record()).returns(Vow$(M.string())),
      }),
      subscribeToPatternWatcher: M.interface('subscribeToPatternWatcher', {
        onFulfilled: M.call(M.pattern()).returns(Vow$(M.any())),
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
         * @returns {Vow<Bytes>}
         */
        waitForIBCAck(packetSender, opts) {
          const { opName = 'Unknown' } = opts || {};

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
            { opts, patternResolver: pattern.resolver },
          );

          // If the pattern is fulfilled, process it.
          const processedV = watch(matchV, this.facets.processIBCReplyWatcher, {
            opName,
          });

          // If anything fails, try to reject the packet sender.
          return watch(
            processedV,
            this.facets.rejectResolverAndRethrowWatcher,
            {
              resolver: pattern.resolver,
            },
          );
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
          return watch(
            E(sender).sendPacket(ctx.opts),
            this.facets.packetWasSentWatcher,
            {
              ...ctx,
              match,
            },
          );
        },
      },
      packetWasSentWatcher: {
        onFulfilled(packetPattern, ctx) {
          const { patternResolver, match } = ctx;
          // Match an acknowledgement or timeout packet.
          const ackOrTimeoutPacket = M.or(
            M.splitRecord({
              event: 'acknowledgementPacket',
              packet: packetPattern,
              acknowledgement: M.string(),
            }),
            M.splitRecord({
              event: 'timeoutPacket',
              packet: packetPattern,
            }),
          );
          patternResolver.resolve(ackOrTimeoutPacket);
          return match;
        },
      },
      subscribeToPatternWatcher: {
        onFulfilled(_pattern) {
          // FIXME: Implement this!
          return watch({
            type: 'VTRANSFER_IBC_EVENT',
            event: 'acknowledgementPacket',
            acknowledgement: byteSourceToBase64(
              JSON.stringify({ result: 'AQ==' }),
            ),
          });
        },
      },
      processIBCReplyWatcher: {
        onFulfilled({ event, acknowledgement }, { opName }) {
          assertAllDefined({ event, acknowledgement });
          switch (event) {
            case 'acknowledgementPacket':
              return base64ToBytes(acknowledgement);
            case 'timeoutPacket':
              throw Fail`${bare(opName)} operation received timeout packet`;
            default:
              throw Fail`Unexpected event: ${event}`;
          }
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

  return harden({ makePacketTools, makeTransferSender });
};
harden(preparePacketTools);

/**
 * @typedef {Awaited<
 *   ReturnType<ReturnType<typeof preparePacketTools>['makePacketTools']>
 * >} PacketTools
 */
