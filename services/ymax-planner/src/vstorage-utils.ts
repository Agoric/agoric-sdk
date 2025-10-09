/// <reference types="ses" />
import type {
  VStorage,
  QueryChildrenMetaResponse,
  QueryDataMetaResponse,
} from '@agoric/client-utils';
import { mustMatch, throwErrorCode, tryJsonParse } from '@agoric/internal';
import {
  StreamCellShape,
  type StreamCell,
} from '@agoric/internal/src/lib-chainStorage.js';
import { Fail, q } from '@endo/errors';

// #region vstorage paths, cf. golang/cosmos/x/vstorage/types/path_keys.go
// TODO: Promote elsewhere, maybe @agoric/internal?

const vstoragePathPatt = /^$|^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/;
const assertVstoragePath = (vstoragePath: string) => {
  if (vstoragePath.match(vstoragePathPatt)) return;
  const p = q(vstoragePath);
  !vstoragePath.startsWith('.') || Fail`path ${p} starts with separator`;
  !vstoragePath.endsWith('.') || Fail`path ${p} ends with separator`;
  !vstoragePath.includes('..') || Fail`path ${p} contains doubled separators`;
  Fail`path ${p} contains invalid characters`;
};

/**
 * Compare a vstorage path to an ostensible ancestor path and return the count
 * of segments separating them. The count will be 0 when the paths are equal, 1
 * when the ancestor is a direct parent, 2 when the ancestor is a grandparent,
 * etc., and negated when the "ancestor" is actually a descendant.
 * If neither path is a prefix of the other, then the count will be NaN.
 */
export const countVstoragePathSegmentsRelativeTo = (
  vstoragePath: string,
  ancestorPath: string,
): number => {
  assertVstoragePath(vstoragePath);
  assertVstoragePath(ancestorPath);
  const extraStringLen = vstoragePath.length - ancestorPath.length;
  if (extraStringLen < 0) {
    // vstoragePath may be the ancestor; negate a reversed call.
    return -1 * countVstoragePathSegmentsRelativeTo(ancestorPath, vstoragePath);
  }
  if (extraStringLen === 0) return vstoragePath === ancestorPath ? 0 : NaN;

  // The empty path is a special case.
  if (ancestorPath === '') return vstoragePath.split('.').length;

  if (!vstoragePath.startsWith(`${ancestorPath}.`)) return NaN;
  const suffix = vstoragePath.slice(ancestorPath.length + 1);
  const suffixSegments = suffix.split('.');
  return suffixSegments.length;
};
harden(countVstoragePathSegmentsRelativeTo);

export const vstoragePathIsParentOf = (
  vstoragePath: string,
  childPath: string,
) => countVstoragePathSegmentsRelativeTo(childPath, vstoragePath) === 1;
harden(vstoragePathIsParentOf);

export const vstoragePathIsAncestorOf = (
  vstoragePath: string,
  descendantPath: string,
) => countVstoragePathSegmentsRelativeTo(descendantPath, vstoragePath) > 0;
harden(vstoragePathIsAncestorOf);

// #endregion

export const parseStreamCell = (json: string, vstoragePath: string) => {
  const streamCell = tryJsonParse(
    json,
    `non-JSON value at vstorage path ${q(vstoragePath)}`,
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
    `non-JSON StreamCell value for ${q(vstoragePath)} index ${q(index)}`,
  );
  return value;
};
harden(parseStreamCellValue);

export const STALE_RESPONSE = 'STALE_RESPONSE';

type ReadStorageMetaOptions<
  MethodName extends 'children' | 'data',
  Result = MethodName extends 'children'
    ? QueryChildrenMetaResponse
    : QueryDataMetaResponse,
> = Partial<{
  minBlockHeight?: bigint;
  retries?: number;
  transformResponse?: (
    metaResponse: MethodName extends 'children'
      ? QueryChildrenMetaResponse
      : QueryDataMetaResponse,
  ) => Result;
}>;

/**
 * Make a vstorage Children or Data query, returning the decoded result along
 * with response metadata derived from fields documented at
 * https://docs.cometbft.com/v1.0/spec/abci/abci++_methods#query (for
 * successful responses, `log` and `height` [as `blockHeight`], and for error
 * responses, `codespace` and `code`) or a transformation thereof.
 * UNTIL https://github.com/Agoric/agoric-sdk/pull/11630
 */
export const readStorageMeta = async <
  M extends 'children' | 'data',
  Result = M extends 'children'
    ? QueryChildrenMetaResponse
    : QueryDataMetaResponse,
>(
  vstorage: VStorage,
  vstoragePath: string,
  kind: M,
  {
    minBlockHeight = 0n,
    retries = 0,
    transformResponse = (x => x) as any,
  }: ReadStorageMetaOptions<M, Result> = {},
) => {
  await null;
  let finalErr: undefined | Error;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const metaResponse = (await vstorage.readStorageMeta(vstoragePath, {
        kind,
      })) as M extends 'children'
        ? QueryChildrenMetaResponse
        : QueryDataMetaResponse;
      const { blockHeight } = metaResponse;
      if (typeof blockHeight !== 'bigint') {
        throw Fail`blockHeight ${blockHeight} must be a bigint`;
      }
      if (blockHeight < minBlockHeight) {
        throwErrorCode(`old blockHeight ${blockHeight}`, STALE_RESPONSE);
      }
      return transformResponse(metaResponse);
    } catch (err) {
      if (err.code || !finalErr) finalErr = err;
    }
  }
  throw finalErr;
};
harden(readStorageMeta);

/**
 * Read from a vstorage path, requiring the data to be a StreamCell of
 * CapData-encoded values and returning the decoding of the final one.
 * UNTIL https://github.com/Agoric/agoric-sdk/pull/11630
 */
export const readStreamCellValue = async (
  vstorage: VStorage,
  vstoragePath: string,
  opts?: Pick<ReadStorageMetaOptions<'data'>, 'minBlockHeight' | 'retries'>,
) => {
  const streamCell = await readStorageMeta(
    vstorage,
    vstoragePath,
    'data' as const,
    {
      ...opts,
      transformResponse: metaResponse =>
        parseStreamCell(metaResponse.result.value, vstoragePath),
    },
  );
  return parseStreamCellValue(streamCell, -1, vstoragePath);
};
harden(readStreamCellValue);
