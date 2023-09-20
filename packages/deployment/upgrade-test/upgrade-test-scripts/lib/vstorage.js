// @ts-check
/* global Buffer */
import { assert, Fail } from './assert.js';

const { freeze: harden } = Object; // XXX

// from '@agoric/internal/src/lib-chainStorage.js';
const isStreamCell = cell =>
  cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);
harden(isStreamCell);

/**
 * Extract one value from a the vstorage stream cell in a QueryDataResponse
 *
 * @param {object} data
 * @param {number} [index] index of the desired value in a deserialized stream cell
 *
 * XXX import('@agoric/cosmic-proto/vstorage/query').QueryDataResponse doesn't worksomehow
 * @typedef {Awaited<ReturnType<import('@agoric/cosmic-proto/vstorage/query.js').QueryClientImpl['Data']>>} QueryDataResponseT
 */
export const extractStreamCellValue = (data, index = -1) => {
  const { value: serialized } = data;

  serialized.length > 0 || Fail`no StreamCell values: ${data}`;

  const streamCell = JSON.parse(serialized);
  if (!isStreamCell(streamCell)) {
    throw Fail`not a StreamCell: ${streamCell}`;
  }

  const { values } = streamCell;
  values.length > 0 || Fail`no StreamCell values: ${streamCell}`;

  const value = values.at(index);
  assert.typeof(value, 'string');
  return value;
};
harden(extractStreamCellValue);
