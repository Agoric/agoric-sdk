/* eslint-env node */

import { execa } from 'execa';
import {
  boardSlottingMarshaller,
  makeFromBoard,
  waitUntilOfferResult,
  fetchEnvNetworkConfig,
} from '@agoric/client-utils';
import {
  agopsLocation,
  agoric,
  executeCommand,
  mkTemp,
} from '@agoric/synthetic-chain';
import fsp from 'node:fs/promises';

/** @import {Result as ExecaResult, ExecaError} from 'execa'; */
/**
 * @typedef {ExecaResult & { all: string } & (
 *     | { failed: false }
 *     | Pick<
 *         ExecaError & { failed: true },
 *         | 'failed'
 *         | 'shortMessage'
 *         | 'cause'
 *         | 'exitCode'
 *         | 'signal'
 *         | 'signalDescription'
 *       >
 *   )} SendOfferResult
 */

/**
 * @typedef {object} PsmMetrics
 * @property {import('@agoric/ertp').Amount<'nat'>} anchorPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} feePoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} mintedPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} totalAnchorProvided
 * @property {import('@agoric/ertp').Amount<'nat'>} totalMintedProvided
 */

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

/**
 * @param {string} path
 */
const objectFromVstorageEntries = async path => {
  const rawEntries = await agoric.follow('-lF', `:${path}`, '-o', 'text');
  return Object.fromEntries(marshaller.fromCapData(JSON.parse(rawEntries)));
};

export const snapshotAgoricNames = async () => {
  const [brands, instances, vbankAssets] = await Promise.all([
    objectFromVstorageEntries('published.agoricNames.brand'),
    objectFromVstorageEntries('published.agoricNames.instance'),
    objectFromVstorageEntries('published.agoricNames.vbankAsset'),
  ]);
  return { brands, instances, vbankAssets };
};

/**
 * Similar to
 * https://github.com/Agoric/agoric-3-proposals/blob/422b163fecfcf025d53431caebf6d476778b5db3/packages/synthetic-chain/src/lib/commonUpgradeHelpers.ts#L123-L139
 * However, for an address that is not provisioned, `agoric wallet send` is
 * needed because `agops perf satisfaction` hangs when trying to follow
 * nonexistent vstorage path ":published.wallet.${address}".
 *
 * @param {string} address
 * @param {Promise<string>} offerPromise
 * @returns {Promise<SendOfferResult>}
 */
export const sendOfferAgoric = async (address, offerPromise) => {
  const offerPath = await mkTemp('agops.XXX');
  const offer = await offerPromise;
  await fsp.writeFile(offerPath, offer);

  const [settlement] = await Promise.allSettled([
    execa({
      all: true,
    })`agoric wallet --keyring-backend=test send --offer ${offerPath} --from ${address} --verbose`,
  ]);
  return settlement.status === 'fulfilled'
    ? settlement.value
    : settlement.reason;
};

/**
 * A variant of {@link sendOfferAgoric} that uses `agd` directly to e.g.
 * control gas calculation.
 *
 * @param {string} address
 * @param {Promise<string>} offerPromise
 * @returns {Promise<SendOfferResult>}
 */
export const sendOfferAgd = async (address, offerPromise) => {
  const offer = await offerPromise;
  const networkConfig = await fetchEnvNetworkConfig({
    env: process.env,
    fetch,
  });
  const { chainName, rpcAddrs } = networkConfig;
  const args = /** @type {string[]} */ (
    // @ts-expect-error heterogeneous concat
    [].concat(
      [`--node=${rpcAddrs[0]}`, `--chain-id=${chainName}`],
      [`--keyring-backend=test`, `--from=${address}`],
      ['tx', 'swingset', 'wallet-action', '--allow-spend', offer],
      '--yes',
      '-bblock',
      '-ojson',
    )
  );

  const [settlement] = await Promise.allSettled([
    execa('agd', args, { all: true }),
  ]);

  // Upon successful exit, verify that the *output* also indicates success.
  // cf. https://github.com/Agoric/agoric-sdk/blob/master/packages/agoric-cli/src/lib/wallet.js
  if (settlement.status === 'fulfilled') {
    const result = settlement.value;
    try {
      const tx = JSON.parse(result.stdout);
      if (tx.code !== 0) {
        return { ...result, failed: true, shortMessage: `code ${tx.code}` };
      }
    } catch (err) {
      return {
        ...result,
        failed: true,
        shortMessage: 'unexpected output',
        cause: err,
      };
    }
  }

  return settlement.status === 'fulfilled'
    ? settlement.value
    : settlement.reason;
};

/**
 * @param {string} address
 * @param {Array<any>} params
 * @param {{
 *   follow: (...params: string[]) => Promise<object>;
 *   sendOffer?: (address: string, offerPromise: Promise<string>) => Promise<SendOfferResult>;
 *   setTimeout: typeof global.setTimeout;
 *   now: () => number
 * }} io
 */
export const psmSwap = async (address, params, io) => {
  const { now, sendOffer = sendOfferAgoric, ...waitIO } = io;
  const offerId = `${address}-psm-swap-${now()}`;
  const newParams = ['psm', ...params, '--offerId', offerId];
  const offerPromise = executeCommand(agopsLocation, newParams);
  const sendResult = await sendOffer(address, offerPromise);
  if (sendResult.failed) {
    const {
      command,
      durationMs,
      shortMessage,
      cause,
      exitCode,
      signal,
      signalDescription,
      all: output,
    } = sendResult;
    const summary = {
      command,
      durationMs,
      shortMessage,
      cause,
      exitCode,
      signal,
      signalDescription,
      output,
    };
    console.error('psmSwap tx send failed', summary);
    throw Error(
      `psmSwap tx send failed: ${JSON.stringify({ exitCode, signal, signalDescription })}`,
      { cause },
    );
  }
  console.log('psmSwap tx send results', sendResult.all);

  await waitUntilOfferResult(address, offerId, true, waitIO, {
    errorMessage: `${offerId} not succeeded`,
  });
};
