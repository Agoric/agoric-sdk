/* eslint-env node */
// from z:acceptance/lib/psm-lib.js

import { execa } from 'execa';
import { getNetworkConfig } from 'agoric/src/helpers.js';
import {
  waitUntilOfferResult,
  makeFromBoard,
  boardSlottingMarshaller,
} from '@agoric/client-utils';
import { deepMapObject } from '@agoric/internal';
import {
  agd,
  agoric,
  agopsLocation,
  CHAINID,
  executeCommand,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';

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
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 */

/**
 * Given either an array of [string, Value] or
 * { [labelKey]: string, [valueKey]: Value } entries, or a
 * Record<string, Value> object, log a concise representation similar to
 * the latter but hiding implementation details of any embedded remotables.
 *
 * Sample output from any of the following input data:
 * - { foo: { brand: FooBrand, value: '42' }, bar: { brand: BarBrand, value: '100' } }
 * - [['foo', { brand: FooBrand, value: '42' }], ['bar', { brand: BarBrand, value: '100' }]]
 * - [{ label: 'foo', amount: { brand: FooBrand, value: '42' } },
 *     { label: 'bar', amount: { brand: BarBrand, value: '100' } }]
 *
 *     $label $shape {
 *       foo: {
 *         brand: Object Alleged: Foo brand {},
 *         value: '42',
 *       },
 *       bar: {
 *         brand: Object Alleged: Bar brand {},
 *         value: '100',
 *       },
 *     }
 *
 * where $shape is `{ [label]: amount, ... }` for the third kind of input data
 * but is otherwise empty.
 * @deprecated should be in @agoric/client-utils?
 *
 * @template [Value=unknown]
 * @param {string} label
 * @param {Array<[string, Value] | object> | Record<string, Value>} data
 * @param {(...args: unknown[]) => void} [log]
 * @returns {void}
 */
export const logRecord = (label, data, log = console.log) => {
  const entries = Array.isArray(data) ? [...data] : Object.entries(data);
  /** @type {[labelKey: PropertyKey, valueKey: PropertyKey] | undefined} */
  let shape;
  for (let i = 0; i < entries.length; i += 1) {
    let entry = entries[i];
    if (!Array.isArray(entry)) {
      // Determine which key of a two-property "entry object" (e.g.,
      // {denom, amount} or {brand, value} is the label and which is the value
      // (which may be of type object or number or bigint or string).
      if (!shape) {
        const entryKeys = Object.keys(entry);
        if (entryKeys.length !== 2) {
          throw Error(
            `[INTERNAL logRecord] not shaped like a record entry: {${entryKeys}}`,
          );
        }
        const valueKeyIndex = entryKeys.findIndex(
          k =>
            typeof entry[k] === 'object' ||
            (entry[k].trim() !== '' && !Number.isNaN(Number(entry[k]))),
        );
        if (valueKeyIndex === undefined) {
          throw Error(
            `[INTERNAL logRecord] no value property: {${entryKeys}}={${Object.values(entry).map(String)}}`,
          );
        }
        shape = /** @type {[string, string]} */ (
          valueKeyIndex === 1 ? entryKeys : entryKeys.reverse()
        );
      }
      // Convert the entry object to a [key, value] entry array.
      entries[i] = shape.map(k => entry[k]);
      entry = entries[i];
    }
    // Simplify remotables in the value.
    entry[1] = deepMapObject(entry[1], value => {
      const tag =
        value && typeof value === 'object' && value[Symbol.toStringTag];
      return tag
        ? Object.defineProperty({}, Symbol.toStringTag, {
            value: tag,
            enumerable: false,
          })
        : value;
    });
  }
  log(
    label,
    shape ? `{ [${String(shape[0])}]: ${String(shape[1])}, ... }` : '',
    Object.fromEntries(entries),
  );
};

/**
 * @typedef {object} PsmMetrics
 * @property {import('@agoric/ertp').Amount<'nat'>} anchorPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} feePoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} mintedPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} totalAnchorProvided
 * @property {import('@agoric/ertp').Amount<'nat'>} totalMintedProvided
 */

/**
 *  Import from synthetic-chain once it is updated
 *
 * @param {string} addr
 * @param {string} wanted
 * @param {string} [from]
 */
export const bankSend = (addr, wanted, from = VALIDATORADDR) => {
  const chain = ['--chain-id', CHAINID];
  const fromArg = ['--from', from];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...fromArg, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', from, addr, wanted, ...noise);
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
  const networkConfig = await getNetworkConfig({ env: process.env, fetch });
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
 *   now: () => number;
 *   log: typeof console.log
 * }} io
 */
export const psmSwap = async (address, params, io) => {
  const { now, sendOffer = sendOfferAgd, ...waitIO } = io;
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

/**
 *
 * @param {Coin[]} balances
 * @param {string} targetDenom
 */
export const extractBalance = (balances, targetDenom) => {
  const balance = balances.find(({ denom }) => denom === targetDenom);
  if (!balance) return 0;
  return Number(balance.amount);
};

/**
 * Checking IST balances can be tricky because of the execution fee mentioned in
 * https://github.com/Agoric/agoric-sdk/issues/6525. So we first check for
 * equality, but if that fails we recheck against an assumption that a fee of
 * the default "minFeeDebit" has been charged.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {number} actualBalance
 * @param {number} expectedBalance
 */
export const tryISTBalances = async (t, actualBalance, expectedBalance) => {
  const firstTry = await t.try(tt => {
    tt.is(actualBalance, expectedBalance);
  });
  if (firstTry.passed) {
    firstTry.commit();
    return;
  }

  firstTry.discard();
  t.log('tryISTBalances assuming no batched IST fee', ...firstTry.errors);
  // See golang/cosmos/x/swingset/types/default-params.go
  // and `ChargeBeans` in golang/cosmos/x/swingset/keeper/keeper.go.
  const minFeeDebit = 200_000;
  t.is(actualBalance + minFeeDebit, expectedBalance);
};

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
