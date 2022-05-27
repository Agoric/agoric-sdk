import { makeSlogSender as makeFlightRecorderSlogSender } from './flight-recorder.js';
import { makeSlogSender as makeOtelSlogSender } from './otel-trace.js';

export const makeSlogSender = async opts => {
  const [flightRecorderSlogSender, otelSlogSender] = await Promise.all([
    makeFlightRecorderSlogSender(opts),
    makeOtelSlogSender(opts),
  ]);
  return obj => {
    flightRecorderSlogSender(obj);
    otelSlogSender(obj);
  };
};
