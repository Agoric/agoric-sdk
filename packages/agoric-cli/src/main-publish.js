/* eslint-env node */
// @ts-check

import path from 'node:path';
import popen from 'node:child_process';
import tmp from 'tmp';

import { parseLocatedJson } from './json.js';

import {
  makeBundlePublisher,
  makeAgdBundlePublisher,
} from './publish.js';

/** @import { AgdLoggingLevel, AgdSignMode } from './publish.js' */

/**
 * @import {CosmosConnectionSpec} from './publish.js';
 */

const publishMain = async (progname, rawArgs, powers, opts) => {
  const { fs } = powers;

  const {
    node: rpcAddress,
    home: homeDirectory,
    chainId: chainID = 'agoric',
  } = opts;

  if (typeof rpcAddress !== 'string') {
    throw Error(`Required flag for agoric publish: -n, --node <rpcAddress>`);
  }

  /** @type {CosmosConnectionSpec} */
  const connectionSpec = {
    type: 'chain-cosmos-sdk',
    rpcAddresses: [rpcAddress],
    homeDirectory,
    chainID,
  };

  const {
    signMode: allegedSignMode,
    logFormat: allegedLogFormat,
    loggingLevel: allegedLoggingLevel,
  } = opts;
  assert(
    allegedSignMode === undefined ||
      ['direct', 'amino-json', 'direct-aux'].includes(allegedSignMode),
  );
  const signMode = /** @type {AgdSignMode} */ (allegedSignMode);
  assert(
    allegedLogFormat === undefined ||
      ['json', 'plain'].includes(allegedLogFormat),
  );
  const logFormat = /** @type {'json' | 'plain'} */ (allegedLogFormat ?? 'plain');
  assert(allegedLoggingLevel === undefined || ['trace', 'debug', 'info', 'warn', 'error', 'panic'].includes(allegedLoggingLevel));
  const loggingLevel = /** @type {AgdLoggingLevel} */(allegedLoggingLevel ?? 'info');

  /** @type {import('./publish.js').TransactionSpec} */
  const transactionSpec = {
    feeGranter: opts.feeGranter,
    feePayer: opts.feePayer,
    fees: opts.fees,
    from: opts.from,
    gas: opts.gas,
    gasAdjustment: opts.gasAdjustment,
    gasPrices: opts.gasPrices,
    home: opts.home,
    keyringBackend: opts.keyringBackend,
    keyringDirectory: opts.keyringDirectory,
    ledger: opts.ledger,
    logFormat,
    logNoColor: opts.logNoColor,
    loggingLevel,
    node: opts.node,
    note: opts.note,
    signMode,
    timeoutHeight: opts.timeoutHeight,
    tip: opts.tip,
    trace: opts.trace,
    useSdk: opts.sdk,
  };

  await null;
  for (const bundlePath of rawArgs.slice(1)) {
    // AWAIT
    const bundleText = await fs.readFile(bundlePath, 'utf-8');
    const bundle = parseLocatedJson(bundleText, bundlePath);

    const publishBundleAgd = makeAgdBundlePublisher({
      pathResolve: path.resolve,
      writeFile: fs.writeFile,
      tmpDirSync: tmp.dirSync,
      random: Math.random,
      spawn: popen.spawn,
    });
    const publishBundle = makeBundlePublisher({
      getDefaultConnection() {
        throw Error(
          'Invariant: publishBundle will never call getDefaultConnection because we provide an explicit connectionSpec',
        );
      },
      publishBundleCosmos: publishBundleAgd,
    });

    // AWAIT
    const hashedBundle = await publishBundle(
      bundle,
      connectionSpec,
      transactionSpec,
    );
    process.stdout.write(`${JSON.stringify(hashedBundle)}\n`);
  }
};

export default publishMain;
