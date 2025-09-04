/// <reference types="ses" />
import type { VStorage } from '@agoric/client-utils';
import { mustMatch } from '@agoric/internal';
import {
  StreamCellShape,
  type StreamCell,
} from '@agoric/internal/src/lib-chainStorage.js';
import { Fail, q, b } from '@endo/errors';

const throwErrorCode = <Code extends string = string>(
  message: string,
  code: Code,
): never => {
  const err = Error(message);
  Object.defineProperty(err, 'code', { value: code, enumerable: true });
  throw err;
};

/**
 * Parse input as JSON, or handle an error (for e.g. substituting a default or
 * applying a more specific message).
 */
export const tryJsonParse = (
  json: string,
  replaceErr?: (err?: Error) => unknown,
) => {
  try {
    const type = typeof json;
    if (type !== 'string') throw Fail`input must be a string, not ${b(type)}`;
    return JSON.parse(json);
  } catch (err) {
    if (!replaceErr) throw err;
    try {
      return replaceErr(err);
    } catch (newErr) {
      if (!newErr.cause) assert.note(newErr, err.message);
      throw newErr;
    }
  }
};
harden(tryJsonParse);

export const parseStreamCell = (json: string, vstoragePath: string) => {
  const streamCell = tryJsonParse(
    json,
    _err => Fail`non-JSON value at vstorage path ${q(vstoragePath)}: ${json}`,
  );
  mustMatch(harden(streamCell), StreamCellShape, vstoragePath);
  return streamCell;
};
harden(parseStreamCell);

export const parseStreamCellValue = (
  streamCell: StreamCell,
  index: number,
  vstoragePath: string,
) => {
  const strValue = streamCell.values.at(index);
  const value = tryJsonParse(
    strValue as string,
    _err =>
      Fail`non-JSON StreamCell value for ${q(vstoragePath)} index ${q(index)}: ${strValue}`,
  );
  return value;
};
harden(parseStreamCellValue);

export const STALE_RESPONSE = 'STALE_RESPONSE';

/**
 * Read from a vstorage path, requiring the data to be a StreamCell of
 * CapData-encoded values and returning the decoding of the final one.
 * UNTIL https://github.com/Agoric/agoric-sdk/pull/11630
 */
export const readStreamCellValue = async (
  vstorage: VStorage,
  vstoragePath: string,
  {
    minBlockHeight = 0n,
    retries = 0,
  }: { minBlockHeight?: bigint; retries?: number } = {},
) => {
  await null;
  let finalErr: undefined | Error;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let streamCell: StreamCell;
    try {
      const { blockHeight, result } = await vstorage.readStorageMeta(
        vstoragePath,
        { kind: 'data' } as const,
      );
      if (typeof blockHeight !== 'bigint') {
        throw Fail`blockHeight ${blockHeight} must be a bigint`;
      }
      if (blockHeight < minBlockHeight) {
        throwErrorCode(`old blockHeight ${blockHeight}`, STALE_RESPONSE);
      }
      streamCell = parseStreamCell(result.value, vstoragePath);
      // We have suitably fresh data; any further errors should propagate.
    } catch (err) {
      if (err.code || !finalErr) finalErr = err;
      continue;
    }
    return parseStreamCellValue(streamCell, -1, vstoragePath);
  }
  throw finalErr;
};
harden(readStreamCellValue);
