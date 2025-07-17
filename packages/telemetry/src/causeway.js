import { readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auth, driver as createDriver, int as neoInt } from 'neo4j-driver';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  makeContextualSlogProcessor,
  SLOG_TYPES,
} from '@agoric/telemetry/src/context-aware-slog.js';

/**
 * @typedef {object} ConsensusParamBlock
 * @property {string} max_bytes
 * @property {string} max_gas
 */

/**
 *
 * @typedef {object} ConsensusParamEvidence
 * @property {string} max_age_num_blocks
 * @property {string} max_age_duration
 * @property {string} max_bytes
 */

/**
 *
 * @typedef {object} ConsensusParamUpdates
 * @property {ConsensusParamBlock} block
 * @property {ConsensusParamEvidence} evidence
 * @property {ConsensusParamValidator} validator
 *
 * @typedef {object} ConsensusParamValidator
 * @property {string[]} pub_key_types
 *
 * @typedef {object} NodeInfo
 * @property {ProtocolVersion} protocol_version - The protocol versions.
 * @property {string} id - The node ID.
 * @property {string} listen_addr - The listen address of the node.
 * @property {string} network - The network ID.
 * @property {string} version - The Tendermint version.
 * @property {string} channels - The channels string.
 * @property {string} moniker - The node's moniker.
 * @property {OtherInfo} other - Other miscellaneous information.
 */

/**
 *
 * @typedef {object} NodeStatusResponse
 * @property {RPCError} [error]
 * @property {number} id
 * @property {string} jsonrpc
 * @property {NodeStatusResult} result
 *
 * @typedef {object} NodeStatusResult
 * @property {NodeInfo} node_info - Information about the node.
 * @property {SyncInfo} sync_info - Information about the node's synchronization status.
 * @property {ValidatorInfo} validator_info - Information about the validator.
 *
 * @typedef {object} OtherInfo
 * @property {string} tx_index - Transaction index status (e.g., "on").
 * @property {string} rpc_address - RPC address.
 *
 */

/**
 * @typedef {object} ProtocolVersion
 * @property {string} p2p - P2P protocol version.
 * @property {string} block - Block protocol version.
 * @property {string} app - Application protocol version.
 *
 * @typedef {object} PubKey
 * @property {string} type - The type of the public key (e.g., "tendermint/PubKeyEd25519").
 * @property {string} value - The base64 encoded value of the public key.
 *
 * @typedef {object} RPCError
 * @property {number} code
 * @property {string} data
 * @property {string} message
 *
 * @typedef {object} SyncInfo
 * @property {string} latest_block_hash - The hash of the latest block.
 * @property {string} latest_app_hash - The application hash of the latest block.
 * @property {string} latest_block_height - The height of the latest block.
 * @property {string} latest_block_time - The timestamp of the latest block.
 * @property {string} earliest_block_hash - The hash of the earliest block.
 * @property {string} earliest_app_hash - The application hash of the earliest block.
 * @property {string} earliest_block_height - The height of the earliest block.
 * @property {string} earliest_block_time - The timestamp of the earliest block.
 * @property {boolean} catching_up - Indicates if the node is catching up to the latest block.
 */

/**
 *
 * @typedef {object} TendermintEvent
 * @property {string} type
 * @property {TendermintEventAttribute[]} attributes
 *
 * @typedef {object} TendermintEventAttribute
 * @property {string} key
 * @property {string} value
 * @property {boolean} index
 *
 * @typedef {object} TendermintResponse
 * @property {RPCError} [error]
 * @property {number} id
 * @property {string} jsonrpc
 * @property {TendermintResult} result
 *
 * @typedef {object} TendermintResult
 * @property {string} height
 * @property {null} txs_results
 * @property {TendermintEvent[]} begin_block_events
 * @property {TendermintEvent[]} end_block_events
 * @property {null} validator_updates
 * @property {ConsensusParamUpdates} consensus_param_updates
 *
 * @typedef {object} ValidatorInfo
 * @property {string} address - The validator's address.
 * @property {PubKey} pub_key - The validator's public key.
 * @property {string} voting_power - The validator's voting power.
 */

// eslint-disable-next-line no-underscore-dangle
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_64_ENCODING = 'base64';
// eslint-disable-next-line no-restricted-syntax
const CORE_EVAL_RUN_ID_REGEX = /bridge-([0-9]+)-x\/gov-0/;
const DEFAULT_CONTEXT_FILE = 'slog-context.json';
export const FILE_ENCODING = 'utf-8';
const IS_NUMBER_REGEX = /^[0-9]+(.[0-9]*)?$/;
const NOT_AVAILABLE_DATA_PLACEHOLDER = 'N/A';
const PROPOSAL_EVENT_TYPE = 'active_proposal';
const PROPOSAL_ID_ATTRIBUTE_KEY = 'proposal_id';
const PROPOSAL_RESULT_ATTRIBUTE_KEY = 'proposal_result';
const PROPOSAL_PASSED_ATTRIBUTE_VALUE = 'proposal_passed';

const NOT_AVAILABLE_DATA_PLACEHOLDER_ENCODED = Buffer.from(
  NOT_AVAILABLE_DATA_PLACEHOLDER,
).toString(BASE_64_ENCODING);

// eslint-disable-next-line no-undef
if (!globalThis.assert)
  // @ts-expect-error
  // eslint-disable-next-line no-undef
  globalThis.assert = val => {
    if (!val) throw Error(`value ${val} is not truthy`);
  };

/**
 * @param {string} blockHeight
 * @param {string} nodeUrl
 */
const getBlockResultEvents = async (blockHeight, nodeUrl) => {
  await null;

  const timeout = 15 * 1000;

  const sleep = () => new Promise(resolve => setTimeout(resolve, timeout));

  while (true) {
    try {
      const response = await fetch(
        `${nodeUrl}/block_results?height=${blockHeight}`,
        {
          headers: {
            Accept: 'application/json',
          },
          method: 'GET',
          signal: AbortSignal.timeout(timeout),
        },
      );

      if (!response.ok)
        throw Error(
          `HTTP Error! status: ${response.status}, reason: ${await response.text()}`,
        );

      const data = /** @type {TendermintResponse} */ (await response.json());

      if (data.error)
        throw Error(
          `RPC Error! status: ${data.error.code}, reason: ${data.error.data}`,
        );

      return data.result;
    } catch (err) {
      console.error(err);
      await sleep();
    }
  }
};

/**
 * @param {string} filePath
 */
const getContextFilePersistenceUtils = filePath => {
  console.warn(`Using file ${filePath} for slogger context`);

  return {
    /**
     * @param {import('@agoric/telemetry/src/context-aware-slog.js').Context} context
     */
    persistContext: context => {
      try {
        writeFileSync(filePath, serializeSlogObj(context), FILE_ENCODING);
      } catch (err) {
        console.error('Error writing context to file: ', err);
      }
    },

    /**
     * @returns {import('@agoric/telemetry/src/context-aware-slog.js').Context | null}
     */
    restoreContext: () => {
      try {
        return JSON.parse(readFileSync(filePath, FILE_ENCODING));
      } catch (parseErr) {
        console.error('Error reading context from file: ', parseErr);
        return null;
      }
    },
  };
};

/**
 * @param {string} blockHeight
 * @param {string} nodeUrl
 */
const getProposalIdFromCoreEvalRun = async (blockHeight, nodeUrl) => {
  const blockResultEvents = await getBlockResultEvents(blockHeight, nodeUrl);

  let proposalIdEncoded = NOT_AVAILABLE_DATA_PLACEHOLDER_ENCODED;

  for (const event of blockResultEvents.end_block_events) {
    if (event.type !== PROPOSAL_EVENT_TYPE) continue;

    let proposalPassed = false;

    for (const attribute of event.attributes)
      if (
        matchEncodedOrDecodedValue(
          PROPOSAL_RESULT_ATTRIBUTE_KEY,
          attribute.key,
        ) &&
        matchEncodedOrDecodedValue(
          PROPOSAL_PASSED_ATTRIBUTE_VALUE,
          attribute.value,
        )
      )
        proposalPassed = true;

    if (proposalPassed)
      proposalIdEncoded =
        event.attributes.find(({ key }) =>
          matchEncodedOrDecodedValue(PROPOSAL_ID_ATTRIBUTE_KEY, key),
        )?.value || proposalIdEncoded;

    if (proposalIdEncoded) break;
  }

  return proposalIdEncoded.match(IS_NUMBER_REGEX)
    ? proposalIdEncoded
    : Buffer.from(proposalIdEncoded, BASE_64_ENCODING).toString();
};

/**
 * @param {import('@agoric/telemetry/src/index.js').MakeSlogSenderOptions} options
 */
export const makeSlogSender = async options => {
  const NEO4J_PASSWORD = options.env?.NEO4J_PASSWORD || 'secretpassword';
  const NEO4J_URI = options.env?.NEO4J_URI || 'neo4j://localhost:7687';
  const NEO4J_USER = options.env?.NEO4J_USER || 'neo4j';
  const NODE_HOST = options.env?.RPCNODES_SERVICE_HOST;
  const NODE_PORT = options.env?.RPCNODES_SERVICE_PORT_RPC;

  const driver = createDriver(NEO4J_URI);
  const persistenceUtils = getContextFilePersistenceUtils(
    options.env?.SLOG_CONTEXT_FILE_PATH ||
      `${options.stateDir || __dirname}/${DEFAULT_CONTEXT_FILE}`,
  );

  const createNewSession = () =>
    driver.session({
      auth: auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    });

  /**
   * @param {Array<() => Promise<void>>} promises
   */
  const addPromisesToChain = (...promises) =>
    // eslint-disable-next-line github/array-foreach
    promises.forEach(
      promise =>
        (promiseChain = promiseChain.then(promise, err =>
          console.log('Caught error: ', err),
        )),
    );

  /**
   * @param {SwingSetCapData} data
   */
  const extractSmallcaps = data => {
    const { body, slots = [] } = data;
    if (body[0] !== '#') throw Error('decoder only handles smallcaps');
    const methargs = JSON.parse(body.slice(1));
    return { methargs, slots };
  };

  /**
   * @param {{[key: string]: any}} obj
   */
  const prepareParams = obj =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toNeoProp(v)]));

  /**
   * @param {any} value
   */
  const toNeoProp = value => {
    if (typeof value === 'bigint') return neoInt(value);
    else if (value && typeof value === 'object') return JSON.stringify(value);
    else return value;
  };

  const contextualSlogProcessor = makeContextualSlogProcessor(
    {},
    persistenceUtils,
  );
  await setupIndexes(createNewSession());

  /** @type {import('@agoric/telemetry/src/context-aware-slog.js').Slog['blockHeight']} */
  let currentBlockHeight = 0;
  /** @type {import('@agoric/telemetry/src/context-aware-slog.js').Slog['time']} */
  let lastBlockTime = 0;
  let promiseChain = Promise.resolve();
  const session = createNewSession();

  /**
   * @param {import('@agoric/telemetry/src/context-aware-slog.js').Slog} slog
   */
  const slogSender = slog => {
    if (!lastBlockTime) lastBlockTime = slog.time;
    const contextualSlog = contextualSlogProcessor(slog);

    const {
      attributes: {
        'block.height': blockHeight,
        'block.time': blockTime,
        'crank.deliveryNum': deliveryNum,
        'run.id': _runId,
        'run.num': runNumber,
        'run.trigger.bundleHash': triggerBundleHash,
        'run.trigger.msgIdx': triggerMsgIdx,
        'run.trigger.sender': triggerSender,
        'run.trigger.source': triggerSource,
        'run.trigger.txHash': triggerTxHash,
        'run.trigger.type': runTriggerType,
      },
      body: { crankNum, kd, ksc, name, phase, type, usedBeans, vatID },
      time,
    } = contextualSlog;

    const runId = _runId || NOT_AVAILABLE_DATA_PLACEHOLDER;

    switch (slog.type) {
      case SLOG_TYPES.COSMIC_SWINGSET.BEGIN_BLOCK: {
        currentBlockHeight = blockHeight;
        addPromisesToChain(async () => {
          await session.run(
            `MERGE (
                block:Block {
                  height: $height
                }
              )
             SET
              block.time = $time,
              block.blockTime = $blockTime
            `,
            prepareParams({ blockTime, height: blockHeight, time }),
          );
        });

        break;
      }
      // eslint-disable-next-line no-restricted-syntax
      case SLOG_TYPES.COSMIC_SWINGSET.RUN.FINISH:
      case SLOG_TYPES.COSMIC_SWINGSET_TRIGGERS.BRIDGE_INBOUND:
      case SLOG_TYPES.COSMIC_SWINGSET_TRIGGERS.DELIVER_INBOUND:
      case SLOG_TYPES.COSMIC_SWINGSET_TRIGGERS.INSTALL_BUNDLE:
      case SLOG_TYPES.COSMIC_SWINGSET_TRIGGERS.TIMER_POLL: {
        const unknowDataIdentifier = 'unknown';

        let currentRunId = _runId;
        let triggerType = runTriggerType;

        if (
          !currentRunId ||
          currentRunId.startsWith(`${unknowDataIdentifier}-`)
        )
          currentRunId = `${phase}-${blockHeight}-${runNumber}`;
        if (!triggerType || triggerType === unknowDataIdentifier)
          triggerType = phase;

        addPromisesToChain(async () => {
          await null;
          let proposalId = NOT_AVAILABLE_DATA_PLACEHOLDER;

          if (NODE_HOST && NODE_PORT) {
            // eslint-disable-next-line no-restricted-syntax
            const matches = currentRunId.match(CORE_EVAL_RUN_ID_REGEX);
            if (matches)
              proposalId = await getProposalIdFromCoreEvalRun(
                matches[1],
                `http://${NODE_HOST}:${NODE_PORT}`,
              );
          }

          await session.run(
            `MERGE (
                run:Run {
                  id: $id
                }
              )
              ON CREATE SET
                run.blockHeight       = $blockHeight,
                run.blockTime         = $blockTime,
                run.computrons        = $computrons,
                run.number            = $number,
                run.proposalID        = $proposalId,
                run.time              = $time,
                run.triggerBundleHash = $triggerBundleHash,
                run.triggerMsgIdx     = $triggerMsgIdx,
                run.triggerSender     = $triggerSender,
                run.triggerSource     = $triggerSource,
                run.triggerTxHash     = $triggerTxHash,
                run.triggerType       = $triggerType
              ON MATCH SET
                run.blockHeight       = $blockHeight,
                run.blockTime         = $blockTime,
                run.computrons        = $computrons,
                run.number            = $number,
                run.proposalID        = $proposalId,
                run.time              = $time,
                run.triggerBundleHash = $triggerBundleHash,
                run.triggerMsgIdx     = $triggerMsgIdx,
                run.triggerSender     = $triggerSender,
                run.triggerSource     = $triggerSource,
                run.triggerTxHash     = $triggerTxHash,
                run.triggerType       = $triggerType
              RETURN run;
            `,
            prepareParams({
              blockHeight,
              blockTime,
              computrons: usedBeans || 0,
              id: currentRunId,
              number: runNumber || NOT_AVAILABLE_DATA_PLACEHOLDER,
              proposalId,
              time,
              triggerBundleHash:
                triggerBundleHash || NOT_AVAILABLE_DATA_PLACEHOLDER,
              triggerMsgIdx: triggerMsgIdx || 0,
              triggerSender: triggerSender || NOT_AVAILABLE_DATA_PLACEHOLDER,
              triggerSource: triggerSource || NOT_AVAILABLE_DATA_PLACEHOLDER,
              triggerTxHash: triggerTxHash || NOT_AVAILABLE_DATA_PLACEHOLDER,
              triggerType,
            }),
          );
        });

        break;
      }
      case SLOG_TYPES.CREATE_VAT: {
        addPromisesToChain(async () => {
          await session.run(
            `MERGE (
                vat:Vat {
                  vatID: $vatID
                }
              )
             SET
              vat.name = $name,
              vat.createdAt = $time
            `,
            prepareParams({ name: name || vatID, time, vatID }),
          );
        });

        break;
      }
      case SLOG_TYPES.DELIVER: {
        if (!kd) return;
        const [deliveryType] = kd;

        switch (deliveryType) {
          case 'message': {
            const [, ...rest] = kd;
            const [target, { methargs, result }] = rest;

            let method = 'unknown';
            let methodArguments = 'unknown';
            try {
              const { methargs: args } = extractSmallcaps(methargs);
              [method, methodArguments] = args;
            } catch (error) {
              console.warn('Failed to extract method name:', error);
            }

            addPromisesToChain(async () => {
              await session.run(
                `CREATE (
                    message:Message {
                      argSize: $argSize,
                      blockHeight: $blockHeight,
                      crankNum: $crankNum,
                      deliveryNum: $deliveryNum,
                      elapsed: $elapsed,
                      methargs: $methargs,
                      method: $method,
                      result: $result,
                      runID: $runId,
                      target: $target,
                      time: $time,
                      type: $type
                    }
                  )
                 WITH message
                 MATCH (vat:Vat {vatID: $vatID})
                 CREATE (message)-[
                    :CALL
                  ]->(vat)`,
                prepareParams({
                  argSize: methargs.body.length,
                  blockHeight: currentBlockHeight,
                  crankNum,
                  deliveryNum,
                  elapsed: time - lastBlockTime,
                  methargs: methodArguments || 'unknown',
                  method,
                  result,
                  runId,
                  target,
                  time,
                  type,
                  vatID,
                }),
              );
            });

            break;
          }
          case 'notify': {
            const [, resolutions] = kd;
            for (const [kpid, { state = 'unknown' }] of resolutions) {
              addPromisesToChain(async () => {
                await session.run(
                  `CREATE (
                      notify:Notify {
                        blockHeight: $blockHeight,
                        elapsed: $elapsed,
                        kpid: $kpid,
                        method: $state,
                        runID: $runId,
                        time: $time,
                        type: $type
                      }
                    )
                   WITH notify
                   MATCH (vat:Vat {vatID: $vatID})
                   CREATE (notify)-[
                      :CALL
                    ]->(vat)`,
                  prepareParams({
                    blockHeight: currentBlockHeight,
                    elapsed: time - lastBlockTime,
                    kpid,
                    runId,
                    state,
                    time,
                    type,
                    vatID,
                  }),
                );
              });
            }

            break;
          }
          default:
            break;
        }

        break;
      }
      case SLOG_TYPES.SYSCALL: {
        if (!ksc) return;
        const [kernelSyscallType] = ksc;

        switch (kernelSyscallType) {
          case 'resolve': {
            const [_, __, parts] = ksc;
            for (const [kp] of parts) {
              addPromisesToChain(async () => {
                await session.run(
                  `CREATE (
                      resolve:Resolve {
                        blockHeight: $blockHeight,
                        elapsed: $elapsed,
                        result: $result,
                        runID: $runId,
                        time: $time,
                        type: $type
                      }
                    )
                   WITH resolve
                   MATCH (vat:Vat {vatID: $vatID})
                   CREATE (vat)-[
                      :RESOLVE
                    ]->(resolve)`,
                  prepareParams({
                    blockHeight: currentBlockHeight,
                    elapsed: time - lastBlockTime,
                    result: kp,
                    runId,
                    time,
                    type,
                    vatID,
                  }),
                );
              });
            }
            break;
          }
          case 'send': {
            const [, target, { methargs, result }] = ksc;

            let method = 'unknown';
            let methodArguments = 'unknown';
            try {
              const { methargs: args } = extractSmallcaps(methargs);
              [method, methodArguments] = args;
            } catch (error) {
              console.warn('Failed to extract method name:', error);
            }

            addPromisesToChain(async () => {
              await session.run(
                `CREATE (
                    syscall:Syscall {
                      blockHeight: $blockHeight,
                      elapsed: $elapsed,
                      methargs: $methargs,
                      method: $method,
                      result: $result,
                      runID: $runId,
                      target: $target,
                      time: $time,
                      type: $type
                    }
                  )
                 WITH syscall
                 MATCH (vat:Vat {vatID: $vatID})
                 CREATE (vat)-[
                    :SYSCALL
                 ]->(syscall)`,
                prepareParams({
                  blockHeight: currentBlockHeight,
                  elapsed: time - lastBlockTime,
                  methargs: methodArguments,
                  method,
                  result,
                  runId,
                  target,
                  time,
                  type,
                  vatID,
                }),
              );
            });

            break;
          }
          default:
            break;
        }

        break;
      }
      default:
        break;
    }
  };

  return Object.assign(slogSender, {
    forceFlush: () => promiseChain,
    shutdown: () => promiseChain.then(() => driver.close()),
  });
};

/**
 * @param {string} decodedValue
 * @param {string} value
 */
const matchEncodedOrDecodedValue = (decodedValue, value) =>
  decodedValue === value ||
  Buffer.from(decodedValue).toString(BASE_64_ENCODING) === value;

/**
 * @param {any} slogObj
 */
const serializeSlogObj = slogObj =>
  JSON.stringify(slogObj, (_, value) =>
    // eslint-disable-next-line valid-typeof
    typeof value === BigInt.name.toLowerCase() ? Number(value) : value,
  );

/**
 * @param {ReturnType<ReturnType<typeof createDriver>['session']>} session
 */
const setupIndexes = async session => {
  const indexes = [
    'CREATE INDEX message_result IF NOT EXISTS FOR (message:Message) ON (message.result)',
    'CREATE INDEX message_runId IF NOT EXISTS FOR (message:Message) ON (message.runID)',
    'CREATE INDEX notify_kpid IF NOT EXISTS FOR (notify:Notify) ON (notify.kpid)',
    'CREATE INDEX notify_runId IF NOT EXISTS FOR (notify:Notify) ON (notify.runID)',
    'CREATE INDEX resolve_result IF NOT EXISTS FOR (resolve:Resolve) ON (resolve.result)',
    'CREATE INDEX run_block_height IF NOT EXISTS FOR (run:Run) ON (run.blockHeight)',
    'CREATE INDEX run_id IF NOT EXISTS FOR (run:Run) ON (run.id)',
    'CREATE INDEX syscall_result IF NOT EXISTS FOR (syscall:Syscall) ON (syscall.result)',
  ];
  await null;

  for (const index of indexes) await session.run(index);
  await session.close();
};
