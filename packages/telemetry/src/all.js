// @ts-check
import { makeSlogSender as makeFlightRecorderSlogSender } from './flight-recorder.js';
import { makeSlogSender as makeOtelSlogSender } from './otel-trace.js';

export const makeSlogSender = async opts => {
  const senders = await Promise.all([
    makeFlightRecorderSlogSender(opts),
    makeOtelSlogSender(opts),
  ]);

  const filteredSenders = senders.filter(Boolean);
  if (!filteredSenders.length) {
    return undefined;
  }
  const slogSender = (...args) => {
    for (const sender of filteredSenders) {
      sender?.(...args);
    }
  };
  return Object.assign(slogSender, {
    forceFlush: () =>
      Promise.all(filteredSenders.map(sender => sender?.forceFlush?.())),
  });
};
