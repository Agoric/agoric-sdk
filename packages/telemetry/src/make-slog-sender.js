import path from 'path';
import tmp from 'tmp';
import { PromiseAllOrErrors, unprefixedProperties } from '@agoric/internal';
import { serializeSlogObj } from './serialize-slog-obj.js';

export const DEFAULT_SLOGSENDER_AGENT = 'self';
export const DEFAULT_SLOGSENDER_MODULE =
  '@agoric/telemetry/src/flight-recorder.js';
export const SLOGFILE_SENDER_MODULE = '@agoric/telemetry/src/slog-file.js';

/** @import {SlogSender} from './index.js' */

/**
 * @template T
 * @param {readonly T[]} arr
 * @returns {(T extends null | undefined | '' | false | 0 ? never : T)[]}
 */
const filterTruthy = arr => /** @type {any[]} */ (arr.filter(Boolean));

/**
 * Create an aggregate slog sender that fans out inbound slog entries to modules
 * as indicated by variables in the supplied `env` option. The SLOGSENDER value
 * (or a default DEFAULT_SLOGSENDER_MODULE defined above) is split on commas
 * into a list of module identifiers and adjusted by automatic insertions (a
 * non-empty SLOGFILE value inserts DEFAULT_SLOGSENDER_AGENT defined above), and
 * then each identifier is dynamically `import`ed for its own `makeSlogSender`
 * export, which is invoked with a non-empty `stateDir` option and a modified
 * `env` in which SLOGSENDER_AGENT_* variables have overridden their unprefixed
 * equivalents to produce a subordinate slog sender.
 * Subordinate slog senders remain isolated from each other, and any errors from
 * them are caught and held until the next `forceFlush()` without disrupting
 * any remaining slog entry fanout.
 * If SLOGSENDER_AGENT is 'process', 'slog-sender-pipe.js' is used to load the
 * subordinates in a child process rather than the main process.
 * When there are no subordinates, the return value will be `undefined` rather
 * than a slog sender function.
 *
 * @type {import('./index.js').MakeSlogSender}
 */
export const makeSlogSender = async (opts = {}) => {
  const { env = {}, stateDir: stateDirOption, ...otherOpts } = opts;
  const {
    SLOGSENDER = DEFAULT_SLOGSENDER_MODULE,
    SLOGSENDER_AGENT = DEFAULT_SLOGSENDER_AGENT,
    ...otherEnv
  } = env;

  const agentEnv = {
    ...otherEnv,
    ...unprefixedProperties(otherEnv, 'SLOGSENDER_AGENT_'),
  };

  const slogSenderModules = new Set([
    ...(agentEnv.SLOGFILE ? [SLOGFILE_SENDER_MODULE] : []),
    ...filterTruthy(SLOGSENDER.split(',')).map(modulePath =>
      modulePath.startsWith('.')
        ? // Resolve relative to the current working directory.
          path.resolve(modulePath)
        : modulePath,
    ),
  ]);

  if (!slogSenderModules.size) {
    return undefined;
  }

  if (SLOGSENDER_AGENT === 'process') {
    console.warn('Loading slog sender in subprocess');
    return import('./slog-sender-pipe.js').then(async module =>
      module.makeSlogSender({
        env: {
          ...agentEnv,
          SLOGSENDER,
          SLOGSENDER_AGENT: 'self',
        },
        stateDir: stateDirOption,
        ...otherOpts,
      }),
    );
  } else if (SLOGSENDER_AGENT && SLOGSENDER_AGENT !== 'self') {
    console.warn(
      `Unknown SLOGSENDER_AGENT=${SLOGSENDER_AGENT}; defaulting to 'self'`,
    );
  }

  if (SLOGSENDER) {
    console.warn('Loading slog sender modules:', ...slogSenderModules);
  }

  /** @type {Map<import('./index.js').MakeSlogSender, string>} */
  const makerMap = new Map();
  await Promise.all(
    [...slogSenderModules].map(async moduleIdentifier => {
      await null;
      try {
        const module = await import(moduleIdentifier);
        const { makeSlogSender: maker } = module;
        if (typeof maker !== 'function') {
          throw Error(`No 'makeSlogSender' function exported by module`);
        } else if (maker === makeSlogSender) {
          throw Error(`Cannot recursively load 'makeSlogSender' aggregator`);
        }
        const isReplacing = makerMap.get(maker);
        if (isReplacing) {
          console.warn(
            `The slog sender from ${moduleIdentifier} matches the one from ${isReplacing}.`,
          );
        }
        makerMap.set(maker, moduleIdentifier);
      } catch (err) {
        console.warn(
          `Failed to load slog sender from ${moduleIdentifier}.`,
          err,
        );
      }
    }),
  );

  if (!makerMap.size) {
    return undefined;
  }

  let stateDir = stateDirOption;

  if (stateDir === undefined) {
    stateDir = tmp.dirSync().name;
    console.warn(`Using ${stateDir} for slog sender stateDir`);
  }

  const senders = await Promise.all(
    [...makerMap.entries()].map(async ([maker, moduleIdentifier]) =>
      maker({
        ...otherOpts,
        stateDir,
        env: { ...agentEnv, SLOGSENDER: moduleIdentifier },
      }),
    ),
  ).then(filterTruthy);

  if (!senders.length) {
    return undefined;
  }

  // Optimize creating a JSON serialization only if needed
  // by at least one of the senders.
  const hasSenderUsingJsonObj = senders.some(
    ({ usesJsonObject = true }) => usesJsonObject,
  );
  const getJsonObj = hasSenderUsingJsonObj ? serializeSlogObj : () => undefined;

  const sendErrors = [];

  /** @type {SlogSender} */
  const slogSender = (slogObj, jsonObj = getJsonObj(slogObj)) => {
    for (const sender of senders) {
      try {
        sender(slogObj, jsonObj);
      } catch (err) {
        sendErrors.push(err);
      }
    }
  };
  return Object.assign(slogSender, {
    forceFlush: async () => {
      await PromiseAllOrErrors([
        ...senders.map(sender => sender.forceFlush?.()),
        ...sendErrors.splice(0).map(err => Promise.reject(err)),
      ]);
    },
    shutdown: async () => {
      await PromiseAllOrErrors(senders.map(sender => sender.shutdown?.()));
    },
    usesJsonObject: hasSenderUsingJsonObj,
  });
};
