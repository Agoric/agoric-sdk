// @ts-check
/* global BigUint64Array */
/// <reference types="ses" />

// https://github.com/Agoric/agoric-sdk/issues/3742#issuecomment-1028451575
// I'd mmap() a 100MB file, reserve a few bytes for offsets, then use the rest
// as a circular buffer to hold length-prefixed records. The agd process would
// keep writing new events into the RAM window and updating the start/end
// pointers, with some sequencing to make sure the record gets written before
// the pointer is updated. Then, no mattter how abruptly the process is
// terminated, as long as the host computer itself is still running, the on-disk
// file would contain the most recent state, and anybody who reads the file will
// get the most recent state. The host kernel (linux) is under no obligation to
// flush it to disk any particular time, but knows when reads happen, so there's
// no coherency problem, and the speed is unaffected by disk write speeds.

import BufferFromFile from 'bufferfromfile';
import fs from 'fs';
import path from 'path';

const { details: X } = assert;

export const DEFAULT_CIRCULAR_BUFFER_SIZE = 100 * 1024 * 1024;
export const DEFAULT_CIRCULAR_BUFFER_FILE = 'flight-recorder.bin';
export const SLOG_MAGIC = 0x21474f4c532d4741n; // 'AG-SLOG!'

const I_MAGIC = 0;
const I_ARENA_SIZE = 1;
const I_CIRC_START = 2;
const I_CIRC_END = 3;
const HEADER_LENGTH = 4;

export const makeMemoryMappedCircularBuffer = ({
  circularBufferSize = DEFAULT_CIRCULAR_BUFFER_SIZE,
  stateDir = '/tmp',
  circularBufferFile,
}) => {
  const bufferFile =
    circularBufferFile || `${stateDir}/${DEFAULT_CIRCULAR_BUFFER_FILE}`;
  // console.log({ circularBufferFile, bufferFile });

  // If the file doesn't exist, or is not large enough, create it.
  let stbuf;
  try {
    stbuf = fs.statSync(bufferFile);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  const arenaSize = BigInt(
    circularBufferSize - HEADER_LENGTH * BigUint64Array.BYTES_PER_ELEMENT,
  );
  if (!stbuf || stbuf.size < BigUint64Array.BYTES_PER_ELEMENT * 3) {
    // Write the header.
    const header = new Array(HEADER_LENGTH).fill(0n);
    header[I_MAGIC] = SLOG_MAGIC;
    header[I_ARENA_SIZE] = arenaSize;
    fs.mkdirSync(path.dirname(bufferFile), { recursive: true });
    fs.writeFileSync(bufferFile, BigUint64Array.from(header));
  }
  if (!stbuf || stbuf.size < circularBufferSize) {
    fs.truncateSync(bufferFile, circularBufferSize);
  }

  /** @type {Uint8Array} */
  const fileBuf = BufferFromFile(bufferFile).Uint8Array();
  const header = new BigUint64Array(fileBuf.buffer, 0, HEADER_LENGTH);

  assert.equal(
    SLOG_MAGIC,
    header[I_MAGIC],
    X`${bufferFile} is not a slog buffer; wanted magic ${SLOG_MAGIC}, got ${header[I_MAGIC]}`,
  );
  assert.equal(
    arenaSize,
    header[I_ARENA_SIZE],
    X`${bufferFile} arena size mismatch; wanted ${arenaSize}, got ${header[I_ARENA_SIZE]}`,
  );
  const arena = new Uint8Array(
    fileBuf.buffer,
    header.byteLength,
    Number(arenaSize),
  );

  /**
   * @param {Uint8Array} data
   * @param {number} [offset]
   */
  const readCircBuf = (data, offset = 0) => {
    assert(
      offset + data.byteLength <= arenaSize,
      X`Reading past end of circular buffer`,
    );

    // Read the data to the end of the arena.
    let firstReadLength = data.byteLength;
    const circStart = Number(header[I_CIRC_START]);
    const readStart = (circStart + offset) % Number(arenaSize);
    if (readStart > header[I_CIRC_END]) {
      // The data is wrapped around the end of the arena, like BBB---AAA
      firstReadLength = Math.min(
        firstReadLength,
        Number(arenaSize) - readStart,
      );
    }
    data.set(arena.subarray(readStart, readStart + firstReadLength));
    if (firstReadLength < data.byteLength) {
      data.set(
        arena.subarray(0, data.byteLength - firstReadLength),
        firstReadLength,
      );
    }
    return data;
  };

  /** @param {Uint8Array} data */
  const writeCircBuf = data => {
    if (BigUint64Array.BYTES_PER_ELEMENT + data.byteLength > arena.byteLength) {
      // The data is too big to fit in the arena, so skip it.
      const tooBigRecord = JSON.stringify({
        type: 'slog-record-too-big',
        size: data.byteLength,
      });
      data = new TextEncoder().encode(tooBigRecord);
    }

    const record = new Uint8Array(
      BigUint64Array.BYTES_PER_ELEMENT + data.byteLength,
    );
    const lengthPrefix = new BigUint64Array(record.buffer, 0, 1);
    lengthPrefix[0] = BigInt(data.byteLength);
    record.set(data, BigUint64Array.BYTES_PER_ELEMENT);

    // Check if we need to wrap around.
    /** @type {bigint} */
    let capacity;
    if (header[I_CIRC_START] <= header[I_CIRC_END]) {
      // ---AAAABBBB----
      capacity =
        header[I_ARENA_SIZE] - header[I_CIRC_END] + header[I_CIRC_START];
    } else {
      // BBB---AAAA
      capacity = header[I_CIRC_START] - header[I_CIRC_END];
    }

    let overlap = BigInt(record.byteLength) - capacity;
    while (overlap > 0n) {
      // Advance the start pointer.
      const startRecordLength = new BigUint64Array(1);
      readCircBuf(new Uint8Array(startRecordLength.buffer));

      const totalRecordLength =
        BigInt(startRecordLength.byteLength) + // size of the length field
        startRecordLength[0]; // size of the record

      header[I_CIRC_START] =
        (header[I_CIRC_START] + totalRecordLength) % header[I_ARENA_SIZE];
      overlap -= totalRecordLength;
    }

    // Append the record.
    let firstWriteLength = record.byteLength;
    if (header[I_CIRC_START] < header[I_CIRC_END]) {
      // May need to wrap, it's ---AAAABBBB---
      firstWriteLength = Math.min(
        firstWriteLength,
        Number(header[I_ARENA_SIZE] - header[I_CIRC_END]),
      );
    }

    const circEnd = Number(header[I_CIRC_END]);
    arena.set(record.subarray(0, firstWriteLength), circEnd);
    if (firstWriteLength < record.byteLength) {
      // Write to the beginning of the arena.
      arena.set(record.subarray(firstWriteLength, record.byteLength), 0);
    }
    header[I_CIRC_END] =
      (header[I_CIRC_END] + BigInt(record.byteLength)) % header[I_ARENA_SIZE];
  };

  const writeJSON = obj => {
    const text = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return Number(value);
      }
      if (key === 'endoZipBase64') {
        // Abridge the source bundle, since it's pretty huge.
        return `[${value.length} characters...]`;
      }
      return value;
    });
    // Prepend a newline so that the file can be more easily manipulated.
    const data = new TextEncoder().encode(`\n${text}`);
    // console.log('have obj', obj);
    writeCircBuf(data);
  };

  return { readCircBuf, writeCircBuf, writeJSON };
};

export const makeSlogSender = opts => {
  const { writeJSON } = makeMemoryMappedCircularBuffer(opts);
  return writeJSON;
};
