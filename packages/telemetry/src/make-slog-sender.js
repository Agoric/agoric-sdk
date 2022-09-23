// @ts-check
import path from 'path';
import tmp from 'tmp';
import { PromiseAllOrErrors } from '@agoric/internal';
import { serializeSlogObj } from './serialize-slog-obj.js';

export const DEFAULT_SLOGSENDER_MODULE =
  '@agoric/telemetry/src/flight-recorder.js';
export const SLOGFILE_SENDER_MODULE = '@agoric/telemetry/src/slog-file.js';

/** @typedef {import('./index.js').SlogSender} SlogSender */

/**
 *
 * @param {import('./index.js').MakeSlogSenderOptions} opts
 */
export const makeSlogSender = async (opts = {}) => {
  const { env = {}, stateDir: stateDirOption, ...otherOpts } = opts;
  const { SLOGSENDER = DEFAULT_SLOGSENDER_MODULE, ...otherEnv } = env;

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
  } else if (senders.length === 1) {
    const sender = senders[0];
    const { usesJsonObject = true } = sender;
    return !usesJsonObject
      ? sender
      : Object.assign(
          (slogObj, jsonObj = serializeSlogObj(slogObj)) =>
            sender(slogObj, jsonObj),
          sender,
        );
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
