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

  const slogSenderModules = SLOGSENDER.split(',').map(modulePath =>
    modulePath.startsWith('.')
      ? // Resolve relative to the current working directory.
        path.resolve(modulePath)
      : modulePath,
  );
  if (
    otherEnv.SLOGFILE &&
    !slogSenderModules.includes(SLOGFILE_SENDER_MODULE)
  ) {
    slogSenderModules.push(SLOGFILE_SENDER_MODULE);
  }

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
              SLOGSENDER,
              SLOGSENDER_AGENT: 'self',
              ...otherEnv,
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
          }) =>
            typeof maker === 'function'
              ? { maker, moduleIdentifier }
              : Promise.reject(
                  new Error(`No 'makeSlogSender' function exported by module`),
                ),
        )
        .catch(err => {
          console.warn(
            `Failed to load slog sender from ${moduleIdentifier}.`,
            err,
          );
          return undefined;
        }),
    ),
  );

  if (!makersInfo.filter(Boolean).length) {
    return undefined;
  }

  let stateDir = stateDirOption;

  if (stateDir === undefined) {
    stateDir = tmp.dirSync().name;
    console.warn(`Using ${stateDir} for stateDir`);
  }

  const senders = await Promise.all(
    makersInfo.map(async makerInfo => {
      if (!makerInfo || makerInfo.maker === makeSlogSender) {
        return undefined;
      }
      const { maker, moduleIdentifier } = makerInfo;
      return maker({
        ...otherOpts,
        stateDir,
        env: { SLOGSENDER: moduleIdentifier, ...otherEnv },
      });
    }),
  ).then(
    potentialSenders =>
      /** @type {SlogSender[]} */ (potentialSenders.filter(Boolean)),
  );

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
