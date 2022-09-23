import { makeSlogSender as makeSlogSenderFromEnv } from './make-slog-sender.js';

export const makeSlogSender = async opts => {
  const { SLOGFILE: _1, SLOGSENDER: _2, ...otherEnv } = opts.env || {};

  console.warn(
    'Deprecated slog sender, please use SLOGSENDER=@agoric/telemetry/src/flight-recorder.js,@agoric/telemetry/src/otel-trace.js',
  );

  const senderModules = ['./otel-trace.js', './flight-recorder.js']
    .map(identifier => import.meta.resolve(identifier))
    .join(',');

  return makeSlogSenderFromEnv({
    ...opts,
    env: { ...otherEnv, SLOGSENDER: senderModules },
  });
};
