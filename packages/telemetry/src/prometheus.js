import { Fail } from '@endo/errors';

import { getPrometheusMeterProvider } from './index.js';
import { makeSlogSender as makeOtelMetricsSender } from './otel-metrics.js';

/** @param {import('./index.js').MakeSlogSenderOptions & {otelMeterName?: string}} opts */
export const makeSlogSender = async (opts = {}) => {
  const { env, otelMeterName, serviceName } = opts;
  if (!otelMeterName) throw Fail`OTel meter name is required`;
  const otelMeterProvider = getPrometheusMeterProvider({
    console,
    env,
    serviceName,
  });
  if (!otelMeterProvider) return;

  return makeOtelMetricsSender({ ...opts, otelMeterName, otelMeterProvider });
};
