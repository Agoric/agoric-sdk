/**
 * Vatstore Metrics Tool
 *
 * This tool is designed to periodically gather statistics from a SwingStore SQLite database,
 * specifically counting rows related to Vat storage. It then exposes these metrics in a format
 * suitable for scraping by a Prometheus instance.
 *
 * Usage:
 *   node <script-name> <path-to-sqlite-db> [interval-in-milliseconds]
 *
 * <script-name> - Name of this script.
 * <path-to-sqlite-db> - The path to the SQLite database to be monitored.
 * [interval-in-milliseconds] - Optional. How often to fetch data from the database. Defaults to 10 minutes.
 */

import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import sqlite3 from 'sqlite3';

const DB_READ_INTERVAL = 10 * 60 * 1000; // 10 minutes
const PORT = 9184;
const ENDPOINT = '/metrics';
const MAX_VATS = 80;

const dbFilePath = process.argv[2];
if (!dbFilePath) {
  console.error('SwingStore SQLite database file is required argument.');
  process.exit(1);
}

const dbReadInterval = parseInt(process.argv[3], 10) || DB_READ_INTERVAL;

const vatstores = [];

const db = new sqlite3.Database(dbFilePath);
const getVatstoreStats = async () => {
  for (let id = 1; id <= MAX_VATS; id++) {
    const query = `SELECT COUNT(*) as keyCount FROM kvStore WHERE key LIKE 'v${id}.vs.%'`;
    await db.get(query, [], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }
      if (row.keyCount > 0) {
        vatstores.push({ count: row.keyCount, vatId: `v${id}` });
      }
    });
  }
};

const exporter = new PrometheusExporter(
  {
    port: PORT,
    endpoint: ENDPOINT,
  },
  () => {
    console.log(
      `prometheus scrape endpoint: http://localhost:${PORT}${ENDPOINT}`,
    );
  },
);

// Creates MeterProvider and installs the exporter as a MetricReader
const meterProvider = new MeterProvider();
meterProvider.addMetricReader(exporter);
const meter = meterProvider.getMeter('db-stats');

const observableCounter = meter.createObservableUpDownCounter('vatstore_rows', {
  description: 'Number of rows in the Vat storage ',
});

observableCounter.addCallback(observableResult => {
  for (const vat of vatstores) {
    observableResult.observe(vat.count, { vatId: vat.vatId });
  }
});

function shutdown() {
  console.log('Received shutdown signal. Shutting down gracefully...');

  db.close(err => {
    if (err) {
      console.error('Error closing the database:', err.message);
    }
  });

  exporter.shutdown(() => {
    console.log('Exporter shut down. Exiting...');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

setInterval(getVatstoreStats, dbReadInterval);
