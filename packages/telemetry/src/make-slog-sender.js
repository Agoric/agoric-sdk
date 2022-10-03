// @ts-check
import path from 'path';
import tmp from 'tmp';
import { PromiseAllOrErrors } from '@agoric/internal';
import { serializeSlogObj } from './serialize-slog-obj.js';

export const DEFAULT_SLOGSENDER_MODULE =
  '@agoric/telemetry/src/flight-recorder.js';
export const SLOGFILE_SENDER_MODULE = '@agoric/telemetry/src/slog-file.js';

export const DEFAULT_SLOGSENDER_AGENT = 'self';

/** @typedef {import('./index.js').SlogSender} SlogSender */

/**
 * @template T
 * @param {readonly T[]} arr
 * @returns {(T extends null | undefined | '' | false | 0 ? never : T)[]}
 */
const filterTruthy = arr => /** @type {any[]} */ (arr.filter(Boolean));

/**
 *
 * @param {import('./index.js').MakeSlogSenderOptions} opts
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
    ...Object.fromEntries(
      Object.entries(otherEnv)
        .filter(([k]) => k.match(/^(?:SLOGSENDER_AGENT_)+/)) // narrow to SLOGSENDER_AGENT_ prefixes.
        .map(([k, v]) => [k.replace(/^(?:SLOGSENDER_AGENT_)+/, ''), v]), // Rewrite SLOGSENDER_AGENT_ to un-prefixed version.
    ),
  };

  const slogSenderModules = [
    ...new Set([
      ...(agentEnv.SLOGFILE ? [SLOGFILE_SENDER_MODULE] : []),
      ...SLOGSENDER.split(',')
        .filter(Boolean)
        .map(modulePath =>
          modulePath.startsWith('.')
            ? // Resolve relative to the current working directory.
              path.resolve(modulePath)
            : modulePath,
        ),
    ]),
  ];

  if (!slogSenderModules.length) {
    return undefined;
  }

  switch (SLOGSENDER_AGENT) {
    case '':
    case 'self':
      break;
    case 'process': {
      console.warn('Loading slog sender in subprocess');
      return import('./slog-sender-pipe.js').then(
        async ({ makeSlogSender: makeSogSenderPipe }) =>
          makeSogSenderPipe({
            env: {
              ...agentEnv,
              SLOGSENDER,
              SLOGSENDER_AGENT: 'self',
            },
            stateDir: stateDirOption,
            ...otherOpts,
          }),
      );
    }
    case 'worker':
    default:
      console.warn(`Unknown SLOGSENDER_AGENT=${SLOGSENDER_AGENT}`);
  }

  console.warn('Loading slog sender modules:', ...slogSenderModules);

  const makersInfo = await Promise.all(
    slogSenderModules.map(async moduleIdentifier =>
      import(moduleIdentifier)
        .then(
          /** @param {{makeSlogSender: (opts: {}) => Promise<SlogSender | undefined>}} module */ ({
            makeSlogSender: maker,
          }) => {
            if (typeof maker !== 'function') {
              return Promise.reject(
                new Error(`No 'makeSlogSender' function exported by module`),
              );
            } else if (maker === makeSlogSender) {
              return Promise.reject(
                new Error(
                  `Cannot recursively load 'makeSlogSender' aggregator`,
                ),
              );
            }

            return /** @type {const} */ ([maker, moduleIdentifier]);
          },
        )
        .catch(err => {
          console.warn(
            `Failed to load slog sender from ${moduleIdentifier}.`,
            err,
          );
          return undefined;
        }),
    ),
  ).then(makerEntries => [...new Map(filterTruthy(makerEntries)).entries()]);

  if (!makersInfo.length) {
    return undefined;
  }

  let stateDir = stateDirOption;

  if (stateDir === undefined) {
    stateDir = tmp.dirSync().name;
    console.warn(`Using ${stateDir} for stateDir`);
  }

  const senders = await Promise.all(
    makersInfo.map(async ([maker, moduleIdentifier]) =>
      maker({
        ...otherOpts,
        stateDir,
        env: { ...agentEnv, SLOGSENDER: moduleIdentifier },
      }),
    ),
  ).then(filterTruthy);

  if (!senders.length) {
    return undefined;
  } else {
    // Optimize creating a JSON serialization only if needed
    // by any of the sender modules
    const hasSenderUsingJsonObj = senders.some(
      ({ usesJsonObject = true }) => usesJsonObject,
    );
    const getJsonObj = hasSenderUsingJsonObj
      ? serializeSlogObj
      : () => undefined;
    /** @type {SlogSender} */
    const slogSender = (slogObj, jsonObj = getJsonObj(slogObj)) => {
      for (const sender of senders) {
        try {
          sender(slogObj, jsonObj);
        } catch (err) {
          console.error('WARNING: slog sender error', err);
        }
      }
    };
    return Object.assign(slogSender, {
      forceFlush: async () =>
        PromiseAllOrErrors(senders.map(sender => sender.forceFlush?.())),
      usesJsonObject: hasSenderUsingJsonObj,
    });
  }
};
