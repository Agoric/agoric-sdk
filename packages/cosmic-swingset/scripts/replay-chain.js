#! /usr/bin/env node
// @ts-check

// import '@endo/init';
import '@endo/init/debug.js';

import path from 'path';
import process from 'process';
import fs, { createReadStream } from 'node:fs';
import { Transform } from 'stream';
import zlib from 'zlib';

import '../src/anylogger-agoric.js';
import anylogger from 'anylogger';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import ReadlineTransform from 'readline-transform';

import { makeSlogSender } from '@agoric/telemetry';

// import {
//   importMailbox,
//   exportMailbox,
// } from '@agoric/swingset-vat/src/devices/mailbox/mailbox.js';
// import { makeBufferedStorage } from '@agoric/swingset-vat/src/lib/storageAPI.js';
import '@agoric/notifier/exported.js';

import { assert, details as X, quote as q, Fail } from '@agoric/assert';
import { makeQueue } from '@endo/stream';
import { makePromiseKit } from '@endo/promise-kit';
import { makeFsStreamWriter } from '@agoric/internal/src/fs-stream.js';

import { launch } from '../src/launch-chain.js';
import { getTelemetryProviders } from '../src/kernel-stats.js';
import stringify from '../src/json-stable-stringify.js';
import { encodeParams } from '../src/params.js';
import {
  bufferStreamWrites,
  makeJSONEventWriter,
} from '../src/json-event-writer.js';

const log = anylogger('replay-chain');
const TELEMETRY_SERVICE_NAME = 'replay-cosmos';

const sink = harden(() => {});

/**
 * @param {string} filePath
 * @returns {import('stream').Readable}
 */
const getTranscriptStream = filePath => {
  /** @type {import('stream').Readable} */
  let rawStream = createReadStream(filePath);
  if (filePath.endsWith('.gz')) {
    rawStream = rawStream.pipe(zlib.createGunzip());
  }
  const lineTransform = new ReadlineTransform({ readableObjectMode: true });
  const parseStream = new Transform({
    objectMode: true,
    transform(line, _encodeing, callback) {
      try {
        callback(null, harden(JSON.parse(line)));
      } catch (e) {
        const error = assert.error(X`Error while parsing ${line}`);
        assert.note(error, X`Caused by ${q(e)}`);
        callback(error);
      }
    },
  });
  return rawStream.pipe(lineTransform).pipe(parseStream);
};

const notImplemented = hint => () => {
  throw Fail`${hint} not implemented`;
};

const blockingSendTypes = /** @type {const} */ ([
  'initialize',
  'bootstrap-block',
  'begin-block',
  'end-block',
  'commit-block',
]);
const chainActivityTypes = /** @type {const} */ ([
  'inbound-action',
  'perform-action',
]);
const chainActionTypesPerAction = /** @type {const} */ ([
  'bridge-outbound',
  'installation-publisher-publish',
  'installation-publisher-finish',
  'installation-publisher-fail',
]);
const chainActionTypesPerBlock = /** @type {const} */ ([
  'mailbox-add',
  'mailbox-remove',
  'mailbox-set-acknum',
  'set-activity-hash',
]);

/**
 * @typedef {typeof blockingSendTypes[number]} BlockingSendTypes
 * @typedef {typeof chainActivityTypes[number]} ChainActivityTypes
 * @typedef {BlockingSendTypes | ChainActivityTypes} TranscriptStepTypes
 * @typedef {typeof chainActionTypesPerAction[number]} ChainActionTypesPerAction
 * @typedef {typeof chainActionTypesPerBlock[number]} ChainActionTypesPerBlock
 * @typedef {ChainActionTypesPerAction | ChainActionTypesPerBlock} ChainActionTypes
 * @typedef {TranscriptStepTypes | ChainActionTypes} TranscriptEventType
 */
/**
 * @template {TranscriptEventType} [T=TranscriptEventType]
 * @typedef {{[key: string]: unknown; type: T}} TranscriptEvent
 */

const allEventTypes = [
  ...blockingSendTypes,
  ...chainActivityTypes,
  ...chainActionTypesPerAction,
  ...chainActionTypesPerBlock,
];

/**
 * @template {TranscriptEventType} T
 * @param {TranscriptEvent} event
 * @param {readonly T[]} types
 * @returns {event is TranscriptEvent<T>}
 */
const matchEventType = (event, types) =>
  types.includes(/** @type {T} */ (event.type));

/** @param {TranscriptEvent<BlockingSendTypes>} event */
const makeBlockingSendActionFromEvent = event => {
  switch (event.type) {
    case 'bootstrap-block':
      return { type: 'BOOTSTRAP_BLOCK', blockTime: event.blockTime };
    case 'begin-block':
      return {
        type: 'BEGIN_BLOCK',
        blockHeight: event.blockHeight,
        blockTime: event.blockTime,
        params: encodeParams(event.blockParams),
      };
    case 'end-block':
      return {
        type: 'END_BLOCK',
        blockHeight: event.blockHeight,
        blockTime: event.blockTime,
      };
    case 'commit-block':
      return {
        type: 'COMMIT_BLOCK',
        blockHeight: event.blockHeight,
        blockTime: event.blockTime,
      };
    default:
      throw Fail`Unexpected blocking send event type ${event.type}`;
  }
};

/**
 * @template {(...args: any[]) => AsyncGenerator<any, void, void>} F
 * @param {F} generatorFn
 * @returns {F}
 */
const pulledGenerator = generatorFn =>
  /** @type {F} */ (
    (...args) => {
      const generator = generatorFn(...args);
      const results = makeQueue();
      results.put(generator.next());

      const pulled = harden({
        async next() {
          const result = await results.get();
          results.put(generator.next());
          return result;
        },
        async return(value) {
          return generator.return(value);
        },
        async throw(reason) {
          return generator.throw(reason);
        },
        [Symbol.asyncIterator]() {
          return pulled;
        },
      });
      return pulled;
    }
  );

const getEventGroupsFromStream = pulledGenerator(
  // eslint-disable-next-line jsdoc/require-yields
  /**
   * @template {TranscriptStepTypes} SGT
   * @template {ChainActionTypes | ChainActivityTypes} GET
   * @template {TranscriptStepTypes} [EGT=SGT]
   * @param {AsyncIterable<TranscriptEvent>} transcriptStream
   * @param {object} options
   * @param {SGT | readonly SGT[]} options.startGroupType
   * @param {EGT | readonly EGT[]} [options.endGroupType]
   * @param {readonly GET[]} [options.groupEventTypes]
   */
  async function* getEventGroupsFromStream(
    transcriptStream,
    {
      startGroupType,
      endGroupType = /** @type {any} */ (startGroupType),
      groupEventTypes = [],
    },
  ) {
    /** @type {TranscriptEvent<SGT> | undefined} */
    let startEvent;
    /** @type {TranscriptEvent<GET>[]} */
    const groupEvents = [];

    groupEventTypes = harden([...groupEventTypes]);

    startGroupType = harden(
      Array.isArray(startGroupType) ? startGroupType : [startGroupType],
    );
    endGroupType = harden(
      Array.isArray(endGroupType) ? endGroupType : [endGroupType],
    );

    for await (const event of transcriptStream) {
      if (startEvent !== undefined && matchEventType(event, endGroupType)) {
        yield harden({
          startEvent,
          endEvent: event,
          groupEvents: groupEvents.splice(0),
        });
      }

      if (matchEventType(event, startGroupType)) {
        startEvent = event;
      }

      if (matchEventType(event, groupEventTypes)) {
        groupEvents.push(event);
      }
    }

    if (startEvent !== undefined) {
      yield harden({
        startEvent,
        endEvent: undefined,
        groupEvents: groupEvents.splice(0),
      });
    }
  },
);

/**
 * @template [T=unknown]
 * @param {AsyncIterator<T, void, void>} stream
 */
const streamCloner = stream => {
  /** @typedef {() => Promise<IteratorResult<T>>} Next */
  /** @typedef {import('@endo/stream').AsyncQueue<Next>} NextQueue */
  /** @type {Set<NextQueue>} */
  const cloneNextQueues = new Set();

  /** @type {Next} */
  let headNext;

  const updateNext = () => {
    const pullKit = makePromiseKit();
    const resultKit = makePromiseKit();

    headNext = () => {
      pullKit.resolve(undefined);
      return resultKit.promise;
    };
    for (const nextQueue of cloneNextQueues) {
      nextQueue.put(headNext);
    }

    resultKit.resolve(
      pullKit.promise.then(async () => {
        updateNext();
        return stream.next();
      }),
    );
  };

  const makeClonedStream = () => {
    /** @type {NextQueue} */
    const nextQueue = makeQueue();
    cloneNextQueues.add(nextQueue);
    nextQueue.put(headNext);

    /** @type {IteratorReturnResult<void> | undefined} */
    let doneResult;
    let latestPullCompleted;

    /** @type {AsyncGenerator<T, void, void>} */
    const clone = harden({
      async next() {
        if (doneResult) {
          return doneResult;
        }
        const latestKit = makePromiseKit();
        latestPullCompleted = latestKit.promise;
        const next = await nextQueue.get();
        try {
          const result = await next();
          if (result.done) {
            cloneNextQueues.delete(nextQueue);
            doneResult = result;
          }
          return result;
        } finally {
          latestKit.resolve(undefined);
        }
      },
      async return() {
        cloneNextQueues.delete(nextQueue);
        doneResult ||= harden({ done: true, value: undefined });
        await latestPullCompleted;
        return doneResult;
      },
      async throw(reason) {
        cloneNextQueues.delete(nextQueue);
        doneResult ||= harden({ done: true, value: undefined });
        await latestPullCompleted;
        return Promise.reject(reason);
      },
      [Symbol.asyncIterator]() {
        return clone;
      },
    });
    return clone;
  };

  updateNext();
  return harden({
    [Symbol.asyncIterator]: makeClonedStream,
    close: async () => {
      await stream.return?.();
    },
  });
};

/** @param {string} bridgeID */
const makeExactTranscriptBridgeReplayer =
  bridgeID =>
  /** @param {AsyncIterable<TranscriptEvent>} transcriptStream */ transcriptStream => {
    const actionEventsStream = getEventGroupsFromStream(transcriptStream, {
      startGroupType: ['perform-action', 'bootstrap-block'],
      groupEventTypes: ['bridge-outbound'],
    });
    let currentChainActions = [];

    const handleOutbound = (...args) => {
      const expected = currentChainActions.length
        ? stringify(currentChainActions[0].args)
        : '';
      const actual = stringify(args);
      if (expected !== actual) {
        log.error(`anachrophobia strikes "${bridgeID}" module`);
        log.error(`expected:`, expected);
        log.error(`got     :`, actual);
        throw Fail`historical inaccuracy in replay of "${bridgeID}" module`;
      }
      return currentChainActions.shift().result;
    };

    const startingStep = async event => {
      if (event.type !== 'perform-action' && event.type !== 'bootstrap-block')
        return;

      if (currentChainActions.length) {
        log.error(`anachrophobia strikes "${bridgeID}" module`);
        log.error(`expected:`, stringify(currentChainActions));
        log.error(`got     :`, '');
        throw Fail`Remaining chain actions from previous inbound action for module ${bridgeID}`;
      }

      const actionEventsIterResult = await actionEventsStream.next();
      if (actionEventsIterResult.done) {
        throw Fail`Missing transcript action ${event.inboundNum}`;
      }
      const { groupEvents } = actionEventsIterResult.value;

      currentChainActions = groupEvents.filter(
        ({ args }) =>
          /** @type {[string, ...unknown[]]} */ (args)[0] === bridgeID,
      );
    };

    const stop = async () => {
      await actionEventsStream.return();
    };

    return harden({
      bridgeID,
      handleOutbound,
      startingStep,
      stop,
    });
  };

const makeNonReplayStorageModule = () => {
  const bridgeID = 'storage';
  const startingStep = async () => {};
  const stop = async () => {};

  const handleOutbound = (_dstId, message) => {
    if (message.method === 'append') {
      return true;
    }

    throw notImplemented(`Storage ${message.method} method`)();
  };

  return harden({
    bridgeID,
    handleOutbound,
    startingStep,
    stop,
  });
};

/** @param {AsyncIterable<TranscriptEvent>} transcriptStream */
const makeActionOrderChecker = transcriptStream => {
  const inboundActionStream = getEventGroupsFromStream(transcriptStream, {
    startGroupType: 'inbound-action',
  });

  return harden({
    startingStep: async event => {
      if (event.type !== 'perform-action') return;

      const result = await inboundActionStream.next();
      const expectedNum = result.done
        ? 'none'
        : result.value.startEvent.inboundNum;
      if (expectedNum !== event.inboundNum) {
        throw Fail`Unexpected perform-action ${event.inboundNum}, expected ${expectedNum}`;
      }
    },
    stop: async () => {
      await inboundActionStream.return();
    },
  });
};

/** @param {AsyncIterable<TranscriptEvent>} transcriptStream */
const makeActionQueue = transcriptStream => {
  const inboundEventsStream = getEventGroupsFromStream(transcriptStream, {
    startGroupType: 'begin-block',
    endGroupType: 'commit-block',
    groupEventTypes: ['inbound-action'],
  });

  /** @type {TranscriptEvent<'inbound-action'>[] | undefined} */
  let currentBlockInboundActions;

  const yieldInboundActions = function* yieldInboundActions() {
    while (currentBlockInboundActions?.length) {
      yield currentBlockInboundActions.shift()?.action;
    }
  };

  /** @type {ReturnType<import('../src/make-queue.js')['makeQueue']>} */
  const actionQueue = {
    push: notImplemented('actionQueue.push'),
    size() {
      return currentBlockInboundActions ? currentBlockInboundActions.length : 0;
    },
    consumeAll() {
      if (!currentBlockInboundActions) {
        throw Fail`Cannot consume actionQueue outside of block`;
      }

      return yieldInboundActions();
    },
  };

  return harden({
    startingStep: async event => {
      if (event.type === 'commit-block') {
        if (currentBlockInboundActions?.length) {
          throw Fail`Remaining inbound actions in queue`;
        }
        currentBlockInboundActions = undefined;
      }

      if (event.type !== 'end-block') return;

      const result = await inboundEventsStream.next();
      const expectedHeight = result.done
        ? 'none'
        : result.value.startEvent.blockHeight;
      if (result.done || expectedHeight !== event.blockHeight) {
        throw Fail`Unexpected end-block ${event.blockHeight}, expected ${expectedHeight}`;
      }

      currentBlockInboundActions = [...result.value.groupEvents];
    },
    stop: async () => {
      await inboundEventsStream.return();
    },
    produce: {
      actionQueue,
    },
  });
};

const makeDummyMailboxStorage = () => {
  /** @typedef {import('@agoric/swing-store').KVStore & {commit: () => void; abort: () => void;}} ChainStorage */
  /** @type {ChainStorage} */
  const mailboxStorage = {
    abort: () => {},
    commit: () => {},
    has: notImplemented('mailboxStorage.has'),
    get: notImplemented('mailboxStorage.get'),
    getNextKey: notImplemented('mailboxStorage.getKeys'),
    set: notImplemented('mailboxStorage.set'),
    delete: notImplemented('mailboxStorage.delete'),
  };

  return harden({
    startingStep: async _event => {},
    stop: async () => {},
    produce: {
      mailboxStorage,
    },
  });
};

const makeDummySetActivityHash = () => {
  const setActivityhash = _activityhash => {
    // const msg = stringify({
    //   method: 'set',
    //   key: STORAGE_PATH.ACTIVITYHASH,
    //   value: activityhash,
    // });
    // chainSend(portNums.storage, msg);
    // throw Error('TODO');
  };

  return harden({
    startingStep: async _event => {},
    stop: async () => {},
    produce: {
      setActivityhash,
    },
  });
};

const makeDummyInstallationPublisherMaker = () => {
  /** @returns {Publisher<unknown>} */
  const makeInstallationPublisher = () => {
    return harden({ publish() {}, finish() {}, fail() {} });
  };

  return harden({
    startingStep: async _event => {},
    stop: async () => {},
    produce: {
      makeInstallationPublisher,
    },
  });
};

/**
 * @template {string | undefined} [BridgeID=undefined]
 * @typedef {object} TranscriptModule
 * @property {(event: TranscriptEvent<TranscriptStepTypes>) => Promise<void>} startingStep
 * @property {() => Promise<void>} stop
 * @property {BridgeID} [bridgeID]
 * @property {(dstID: BridgeID, ...args: any[]) => any} [handleOutbound]
 * @property {Record<string, object>} [produce]
 */
/**
 * @typedef {(transcriptStream: AsyncIterable<TranscriptEvent>) => TranscriptModule} TranscriptModuleMaker
 */

/** @type {TranscriptModuleMaker[]} */
const configuredModules = harden([
  makeDummyMailboxStorage,
  makeDummySetActivityHash,
  makeDummyInstallationPublisherMaker,
  makeActionQueue,
  makeActionOrderChecker,
  makeNonReplayStorageModule,
  makeExactTranscriptBridgeReplayer('bank'),
]);

const requiredLaunchParams = /** @type {const} */ ([
  'bridgeOutbound',
  'actionQueue',
  'setActivityhash',
  'mailboxStorage',
]);

/**
 * @param {AsyncIterable<TranscriptEvent>} transcriptStream
 */
const aggregateModules = transcriptStream => {
  /** @type {Record<string, TranscriptModule['handleOutbound']>} */
  const bridgeHandlers = {};
  const startingSteps = [];
  const stops = [];
  const aggregatedProduce = {};

  for (const moduleMaker of configuredModules) {
    const {
      startingStep,
      stop,
      bridgeID,
      handleOutbound,
      produce = {},
    } = moduleMaker(transcriptStream);
    startingSteps.push(startingStep);
    stops.push(stop);
    Object.assign(aggregatedProduce, produce);
    if (bridgeID) {
      bridgeHandlers[bridgeID] = handleOutbound;
    }
  }

  aggregatedProduce.bridgeOutbound = (dstID, ...args) => {
    const handler = bridgeHandlers[dstID];
    if (handler === undefined) {
      console.error(
        `warning: bridgeOutbound called for an unknown bridge ${dstID}`,
      );
      // it is dark, and your exception is likely to be eaten by a vat
      throw Error(
        `warning: bridgeOutbound called for an unknown bridge ${dstID}`,
      );
    }

    // TODO: log chainSend ?

    try {
      return handler(dstID, ...args);
    } catch (e) {
      console.error(
        `warning: bridgeOutbound failed for bridge ${dstID} with args ${JSON.stringify(
          args,
        )}`,
        e,
      );
      // it is dark, and your exception is likely to be eaten by a vat
      throw e;
    }
  };

  if (!requiredLaunchParams.every(param => param in aggregatedProduce)) {
    throw Fail`Configured modules missing required launch param`;
  }

  return harden({
    startingStep: async event =>
      Promise.all(
        startingSteps.map(async startingStep => startingStep(event)),
      ).then(sink),
    stop: async () => Promise.all(stops.map(async stop => stop())).then(sink),
    produce: /** @type {Record<typeof requiredLaunchParams[number], any>} */ (
      aggregatedProduce
    ),
  });
};

const main = async ({ env = process.env, baseDir = '.', inputFile }) => {
  const stateDBDir = path.join(baseDir, `ag-cosmos-chain-state`);
  fs.mkdirSync(stateDBDir, { recursive: true });

  const chainOutputTranscriptStream = await makeFsStreamWriter(
    path.resolve(stateDBDir, 'chain-transcript.log'),
  ).then(bufferStreamWrites);

  const chainOutputTranscript = makeJSONEventWriter(
    /** @type {NonNullable<typeof chainOutputTranscriptStream>} */ (
      chainOutputTranscriptStream
    ),
  );

  const chainInputTranscript = streamCloner(
    /** @type {AsyncIterator<TranscriptEvent, void, void>} */ (
      getTranscriptStream(inputFile)[Symbol.asyncIterator]()
    ),
  );

  // TODO: add swingset active check and chainSend transcript output

  const replayChainSends = notImplemented('Replay');
  const clearChainSends = () => [];

  const { metricsProvider } = getTelemetryProviders({
    console,
    env,
    serviceName: TELEMETRY_SERVICE_NAME,
  });

  const { XSNAP_KEEP_SNAPSHOTS } = env;
  const slogSender = await makeSlogSender({
    stateDir: stateDBDir,
    env,
    serviceName: TELEMETRY_SERVICE_NAME,
  });

  const swingStoreTraceFile =
    XSNAP_KEEP_SNAPSHOTS === '1' || XSNAP_KEEP_SNAPSHOTS === 'true'
      ? path.resolve(stateDBDir, 'store-trace.log')
      : undefined;

  const keepSnapshots =
    XSNAP_KEEP_SNAPSHOTS === '1' || XSNAP_KEEP_SNAPSHOTS === 'true';

  const afterCommitCallback = async () => {
    const slogFlushed = Promise.resolve(slogSender?.forceFlush?.()).catch(
      err => {
        console.warn('Failed to flush slog sender', err);
      },
    );

    const chainTranscriptFlushed = Promise.resolve(
      chainOutputTranscriptStream?.flush?.(),
    ).catch(err => {
      console.warn('Failed to flush chain transcript', err);
    });

    await Promise.all([slogFlushed, chainTranscriptFlushed]);

    return {};
  };

  const { startingStep, stop, produce } =
    aggregateModules(chainInputTranscript);

  const chainTranscript = harden({
    /** @param {TranscriptEvent} obj */
    write: async obj => {
      await Promise.all([
        chainOutputTranscript?.write(obj),
        matchEventType(obj, chainActivityTypes) ? startingStep(obj) : undefined,
      ]);
    },
  });

  /** @type {Awaited<ReturnType<typeof launch>>['blockingSend'] | undefined} */
  let blockingSend;

  for await (const event of chainInputTranscript) {
    if (!matchEventType(event, allEventTypes)) {
      throw Fail`Unsupported transcript event ${
        // @ts-expect-error exhaustive check
        event.type
      }`;
    }

    if (!matchEventType(event, blockingSendTypes)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    await startingStep(event);

    if (event.type === 'initialize') {
      const argv = /** @type {any} */ (event.argv);
      const vatconfig = new URL(
        await importMetaResolve(
          env.CHAIN_BOOTSTRAP_VAT_CONFIG ||
            event.vatconfig ||
            argv.bootMsg.params.bootstrap_vat_config,
          import.meta.url,
        ),
      ).pathname;

      const s = await launch({
        ...produce,
        kernelStateDBDir: stateDBDir,
        clearChainSends,
        replayChainSends,
        vatconfig,
        argv,
        env,
        verboseBlocks: true,
        metricsProvider,
        slogSender,
        swingStoreTraceFile,
        keepSnapshots,
        chainTranscript,
        afterCommitCallback,
      });

      if (s.savedHeight || s.savedBlockTime) {
        throw Fail`Restart from saved state not yet implemented`;
      }

      ({ blockingSend } = s);
    } else if (!blockingSend) {
      throw Fail`Chain transcript must start with initialize`;
    } else {
      await blockingSend(makeBlockingSendActionFromEvent(event));
    }
  }

  await stop();
  await chainOutputTranscriptStream?.close();
  await chainInputTranscript.close();
};

// process.once('beforeExit', exitCode => {
//   console.log(
//     'beforeExit',
//     exitCode,
//     process._getActiveRequests(),
//     process._getActiveHandles(),
//   );
// });

main({ inputFile: process.argv[2] }).then(
  () => {
    process.exit(process.exitCode || 0);
  },
  rej => {
    // console.log(process._getActiveRequests(), process._getActiveHandles());
    console.error(rej);
    process.exit(process.exitCode || 2);
  },
);
