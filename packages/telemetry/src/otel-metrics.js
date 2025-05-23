import { q, Fail } from '@endo/errors';

import * as ActionType from '@agoric/internal/src/action-types.js';
import { objectMapMutable } from '@agoric/internal/src/js-utils.js';
import {
  HISTOGRAM_METRICS,
  BLOCK_HISTOGRAM_METRICS,
  KERNEL_STATS_METRICS,
  makeQueueMetrics,
} from '@agoric/internal/src/metrics.js';

/**
 * @import {MetricOptions, ObservableCounter, ObservableUpDownCounter} from '@opentelemetry/api';
 * @import {MeterProvider} from '@opentelemetry/sdk-metrics';
 * @import {TotalMap} from '@agoric/internal';
 */

const knownActionTypes = new Set(Object.values(ActionType.QueuedActionType));

/** @param {import('./index.js').MakeSlogSenderOptions & {otelMeterName: string, otelMeterProvider?: MeterProvider}} opts */
export const makeSlogSender = async (opts = /** @type {any} */ ({})) => {
  const { otelMeterName, otelMeterProvider } = opts;
  if (!otelMeterName) throw Fail`OTel meter name is required`;
  if (!otelMeterProvider) return;

  const shutdown = async () => {
    await otelMeterProvider.shutdown();
  };

  const otelMeter = otelMeterProvider.getMeter(otelMeterName);

  const processedInboundActionCounter = otelMeter.createCounter(
    'cosmic_swingset_inbound_actions',
    { description: 'Processed inbound action counts by type' },
  );
  const histograms = {
    ...objectMapMutable(HISTOGRAM_METRICS, (desc, name) => {
      const { boundaries, ...options } = desc;
      const advice = boundaries && { explicitBucketBoundaries: boundaries };
      return otelMeter.createHistogram(name, { ...options, advice });
    }),
    ...objectMapMutable(BLOCK_HISTOGRAM_METRICS, (desc, name) =>
      otelMeter.createHistogram(name, desc),
    ),
  };

  const inboundQueueMetrics = makeQueueMetrics({
    otelMeter,
    namePrefix: 'cosmic_swingset_inbound_queue',
    descPrefix: 'inbound queue',
    console,
  });

  // Values for KERNEL_STATS_METRICS could be built up locally by observing slog
  // entries, but they are all collectively reported in "kernel-stats"
  // (@see {@link ../../cosmic-swingset/src/kernel-stats.js exportKernelStats})
  // and for now we just reflect that, which requires implementation as async
  // ("observable") instruments rather than synchronous ones.
  /** @typedef {string} KernelStatsKey */
  /** @typedef {string} KernelMetricName */
  /** @type {TotalMap<KernelStatsKey, number>} */
  const kernelStats = new Map();
  /** @type {Map<KernelMetricName, ObservableCounter | ObservableUpDownCounter>} */
  const kernelStatsCounters = new Map();
  for (const meta of KERNEL_STATS_METRICS) {
    const { key, name, sub, metricType, ...options } = meta;
    kernelStats.set(key, 0);
    if (metricType === 'gauge') {
      kernelStats.set(`${key}Up`, 0);
      kernelStats.set(`${key}Down`, 0);
      kernelStats.set(`${key}Max`, 0);
    } else if (metricType !== 'counter') {
      Fail`Unknown metric type ${q(metricType)} for key ${q(key)} name ${q(name)}`;
    }
    let counter = kernelStatsCounters.get(name);
    if (!counter) {
      counter =
        metricType === 'counter'
          ? otelMeter.createObservableCounter(name, options)
          : otelMeter.createObservableUpDownCounter(name, options);
      kernelStatsCounters.set(name, counter);
    }
    const attributes = sub ? { [sub.dimension]: sub.value } : {};
    counter.addCallback(observer => {
      observer.observe(kernelStats.get(key), attributes);
    });
  }
  const expectedKernelStats = new Set(kernelStats.keys());

  /**
   * @typedef {object} LazyStats
   * @property {string} namePrefix
   * @property {MetricOptions} options
   * @property {Set<string>} keys
   * @property {Record<string, number>} data
   */
  /** @type {(namePrefix: string, description: string) => LazyStats} */
  const makeLazyStats = (namePrefix, description) => {
    return { namePrefix, options: { description }, keys: new Set(), data: {} };
  };
  const dynamicAfterCommitStatsCounters = {
    memoryUsage: makeLazyStats(
      'memoryUsage_',
      'kernel process memory statistic',
    ),
    heapStats: makeLazyStats('heapStats_', 'v8 kernel heap statistic'),
  };

  const slogSender = ({ type: slogType, ...slogObj }) => {
    switch (slogType) {
      // Consume cosmic-swingset block lifecycle slog entries.
      case 'cosmic-swingset-init': {
        const { inboundQueueInitialLengths: lengths } = slogObj;
        inboundQueueMetrics.initLengths(lengths);
        break;
      }
      case 'cosmic-swingset-begin-block': {
        const {
          interBlockSeconds,
          afterCommitHangoverSeconds,
          blockLagSeconds,
        } = slogObj;

        Number.isFinite(interBlockSeconds) &&
          histograms.interBlockSeconds.record(interBlockSeconds);
        histograms.afterCommitHangoverSeconds.record(
          afterCommitHangoverSeconds,
        );
        Number.isFinite(blockLagSeconds) &&
          histograms.blockLagSeconds.record(blockLagSeconds);
        break;
      }
      case 'cosmic-swingset-run-finish': {
        histograms.swingset_block_processing_seconds.record(slogObj.seconds);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        const { inboundQueueStartLengths, processedActionCounts } = slogObj;
        inboundQueueMetrics.updateLengths(inboundQueueStartLengths);
        for (const processedActionRecord of processedActionCounts) {
          const { count, phase, type: actionType } = processedActionRecord;
          if (!knownActionTypes.has(actionType)) {
            console.warn('Unknown inbound action type', actionType);
          }
          processedInboundActionCounter.add(count, { actionType });
          inboundQueueMetrics.decLength(phase);
        }
        break;
      }
      case 'cosmic-swingset-commit-block-finish': {
        const {
          runSeconds,
          chainTime,
          saveTime,
          cosmosCommitSeconds,
          fullSaveTime,
        } = slogObj;
        histograms.swingsetRunSeconds.record(runSeconds);
        histograms.swingsetChainSaveSeconds.record(chainTime);
        histograms.swingsetCommitSeconds.record(saveTime);
        histograms.cosmosCommitSeconds.record(cosmosCommitSeconds);
        histograms.fullCommitSeconds.record(fullSaveTime);
        break;
      }

      // Consume Swingset kernel slog entries.
      case 'vat-startup-finish': {
        histograms.swingset_vat_startup.record(slogObj.seconds * 1000);
        break;
      }
      case 'crank-finish': {
        const { crankType, messageType, seconds } = slogObj;
        // TODO: Reflect crankType/messageType as proper dimensional attributes.
        // For now, we're going for parity with direct metrics.
        if (crankType !== 'routing' && messageType !== 'create-vat') {
          histograms.swingset_crank_processing_time.record(seconds * 1000);
        }
        break;
      }

      // Consume miscellaneous slog entries.
      case 'kernel-stats': {
        const { stats } = slogObj;
        const notYetFoundKernelStats = new Set(expectedKernelStats);
        for (const [key, value] of Object.entries(stats)) {
          notYetFoundKernelStats.delete(key);
          if (!kernelStats.has(key)) {
            console.warn('Unexpected SwingSet kernel statistic', key);
          }
          kernelStats.set(key, value);
        }
        if (notYetFoundKernelStats.size) {
          console.warn('Expected SwingSet kernel statistics not found', [
            ...notYetFoundKernelStats,
          ]);
        }
        break;
      }
      case 'cosmic-swingset-after-commit-stats': {
        const dynamicCounterEntries = Object.entries(
          dynamicAfterCommitStatsCounters,
        );
        for (const [slogKey, meta] of dynamicCounterEntries) {
          const { namePrefix, options, keys } = meta;
          meta.data = slogObj[slogKey] || {};
          const newKeys = Object.keys(meta.data).filter(key => !keys.has(key));
          for (const key of newKeys) {
            keys.add(key);
            const name = `${namePrefix}${key}`;
            const gauge = otelMeter.createObservableUpDownCounter(
              name,
              options,
            );
            gauge.addCallback(observer => {
              observer.observe(meta.data[key]);
            });
          }
        }
        break;
      }
      default:
        break;
    }
  };
  return Object.assign(slogSender, {
    shutdown,
    usesJsonObject: false,
  });
};
