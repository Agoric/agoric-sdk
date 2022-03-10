// @ts-check
import path from 'path';
import tmp from 'tmp';

export const DEFAULT_SLOG_SENDER_MODULE =
  '@agoric/telemetry/src/flight-recorder.js';

export const makeSlogSenderFromModule = async (
  slogSenderModule = DEFAULT_SLOG_SENDER_MODULE,
  makerOpts = {},
) => {
  if (!slogSenderModule) {
    return undefined;
  }

  if (slogSenderModule.startsWith('.')) {
    // Resolve relative to the current working directory.
    slogSenderModule = path.resolve(slogSenderModule);
  }

  console.warn(`Loading makeSlogSender from ${slogSenderModule}`);
  const { makeSlogSender: maker } = await import(slogSenderModule);
  if (typeof maker !== 'function') {
    throw Error(`${slogSenderModule} did not export a makeSlogSender function`);
  }

  const { stateDir = tmp.dirSync().name } = makerOpts;
  if (stateDir !== makerOpts.stateDir) {
    console.warn(`Using ${stateDir} for stateDir`);
  }
  return maker({ ...makerOpts, stateDir });
};
