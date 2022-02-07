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
import { promises as fsPromises } from 'fs';
import path from 'path';

const { details: X } = assert;

export const DEFAULT_CIRCULAR_BUFFER_SIZE = 100 * 1024 * 1024;
export const DEFAULT_CIRCULAR_BUFFER_FILE = 'flight-recorder.bin';
export const SLOG_MAGIC = 0x41472d534c4f4721n; // 'AG-SLOG!'

const I_MAGIC = 0 * BigUint64Array.BYTES_PER_ELEMENT;
const I_ARENA_SIZE = 1 * BigUint64Array.BYTES_PER_ELEMENT;
const I_CIRC_START = 2 * BigUint64Array.BYTES_PER_ELEMENT;
const I_CIRC_END = 3 * BigUint64Array.BYTES_PER_ELEMENT;
const I_ARENA_START = 4 * BigUint64Array.BYTES_PER_ELEMENT;

const initializeCircularBuffer = async (bufferFile, circularBufferSize) => {
  if (!circularBufferSize) {
    return undefined;
  }
  // If the file doesn't exist, or is not large enough, create it.
  const stbuf = await fsPromises.stat(bufferFile).catch(e => {
    if (e.code === 'ENOENT') {
      return undefined;
    }
    throw e;
  });
  const arenaSize = BigInt(circularBufferSize - I_ARENA_START);

  const writeHeader = async () => {
    if (stbuf && stbuf.size >= I_ARENA_START) {
      // Header already exists.
      return;
    }

    // Write the header.
    const headerBuf = new Uint8Array(I_ARENA_START);
    const header = new DataView(headerBuf.buffer);
    header.setBigUint64(I_MAGIC, SLOG_MAGIC);
    header.setBigUint64(I_ARENA_SIZE, arenaSize);
    header.setBigUint64(I_CIRC_START, 0n);
    header.setBigUint64(I_CIRC_END, 0n);

    await fsPromises.mkdir(path.dirname(bufferFile), { recursive: true });
    await fsPromises.writeFile(bufferFile, headerBuf);
  };
  await writeHeader();

  const growFile = async () => {
    if (stbuf && stbuf.size >= circularBufferSize) {
      // File is big enough.
      return;
    }
    // Increase the file size.;
    await fsPromises.truncate(bufferFile, circularBufferSize);
  };
  await growFile();

  return arenaSize;
};

export const makeMemoryMappedCircularBuffer = async ({
  circularBufferSize = DEFAULT_CIRCULAR_BUFFER_SIZE,
  stateDir = '/tmp',
  circularBufferFile,
}) => {
  const bufferFile =
    circularBufferFile || `${stateDir}/${DEFAULT_CIRCULAR_BUFFER_FILE}`;
  // console.log({ circularBufferFile, bufferFile });

  const newArenaSize = await initializeCircularBuffer(
    bufferFile,
    circularBufferSize,
  );

  /** @type {Uint8Array} */
  const fileBuf = BufferFromFile(bufferFile).Uint8Array();
  const header = new DataView(fileBuf.buffer, 0, I_ARENA_START);

  // Detect the arena size from the header, if not initialized.
  const hdrArenaSize = header.getBigUint64(I_ARENA_SIZE);
  const arenaSize = newArenaSize || hdrArenaSize;

  const hdrMagic = header.getBigUint64(I_MAGIC);
  assert.equal(
    SLOG_MAGIC,
    hdrMagic,
    X`${bufferFile} is not a slog buffer; wanted magic ${SLOG_MAGIC}, got ${hdrMagic}`,
  );
  assert.equal(
    arenaSize,
    hdrArenaSize,
    X`${bufferFile} arena size mismatch; wanted ${arenaSize}, got ${hdrArenaSize}`,
  );
  const arena = new Uint8Array(
    fileBuf.buffer,
    header.byteLength,
    Number(arenaSize),
  );

  /**
   * @param {Uint8Array} data
   * @param {number} [offset]
   * @returns {IteratorResult<Uint8Array, void>}
   */
  const readCircBuf = (data, offset = 0) => {
    assert(
      offset + data.byteLength <= arenaSize,
      X`Reading past end of circular buffer`,
    );

    // Read the data to the end of the arena.
    let firstReadLength = data.byteLength;
    const circStart = header.getBigUint64(I_CIRC_START);
    const circEnd = header.getBigUint64(I_CIRC_END);
    const readStart = (Number(circStart) + offset) % Number(arenaSize);
    if (circStart > circEnd) {
      // The data is wrapped around the end of the arena, like BBB---AAA
      firstReadLength = Math.min(
        firstReadLength,
        Number(arenaSize) - readStart,
      );
      if (readStart >= circEnd && readStart < circStart) {
        return { done: true, value: undefined };
      }
    } else if (readStart < circStart || readStart >= circEnd) {
      // The data is contiguous, like ---AAABBB---
      return { done: true, value: undefined };
    }
    data.set(arena.subarray(readStart, readStart + firstReadLength));
    if (firstReadLength < data.byteLength) {
      data.set(
        arena.subarray(0, data.byteLength - firstReadLength),
        firstReadLength,
      );
    }
    return { done: false, value: data };
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
    record.set(data, BigUint64Array.BYTES_PER_ELEMENT);

    const lengthPrefix = new DataView(record.buffer);
    lengthPrefix.setBigUint64(0, BigInt(data.byteLength));

    // Check if we need to wrap around.
    /** @type {bigint} */
    let capacity;
    let circStart = header.getBigUint64(I_CIRC_START);
    const circEnd = header.getBigUint64(I_CIRC_END);
    if (circStart <= circEnd) {
      // ---AAAABBBB----
      capacity = arenaSize - circEnd + circStart;
    } else {
      // BBB---AAAA
      capacity = circStart - circEnd;
    }

    // Advance the start pointer until we have space to write the record.
    let overlap = BigInt(record.byteLength) - capacity;
    while (overlap > 0n) {
      const startRecordLength = new Uint8Array(
        BigUint64Array.BYTES_PER_ELEMENT,
      );
      const { done } = readCircBuf(startRecordLength);
      if (done) {
        break;
      }

      const dv = new DataView(startRecordLength.buffer);
      const totalRecordLength =
        BigInt(startRecordLength.byteLength) + // size of the length field
        dv.getBigUint64(0); // size of the record

      circStart = (circStart + totalRecordLength) % arenaSize;
      header.setBigUint64(I_CIRC_START, circStart);
      overlap -= totalRecordLength;
    }

    // Append the record.
    let firstWriteLength = record.byteLength;
    if (circStart < circEnd) {
      // May need to wrap, it's ---AAAABBBB---
      firstWriteLength = Math.min(
        firstWriteLength,
        Number(arenaSize - circEnd),
      );
    }

    arena.set(record.subarray(0, firstWriteLength), Number(circEnd));
    if (firstWriteLength < record.byteLength) {
      // Write to the beginning of the arena.
      arena.set(record.subarray(firstWriteLength, record.byteLength), 0);
    }
    header.setBigUint64(
      I_CIRC_END,
      (circEnd + BigInt(record.byteLength)) % arenaSize,
    );
  };

  const writeJSON = (obj, jsonObj) => {
    if (jsonObj === undefined) {
      // We need to create a JSON object, since we weren't given one.
      jsonObj = JSON.stringify(obj, (_, arg) =>
        typeof arg === 'bigint' ? Number(arg) : arg,
      );
    }
    // Prepend a newline so that the file can be more easily manipulated.
    const data = new TextEncoder().encode(`\n${jsonObj}`);
    // console.log('have obj', obj, data);
    writeCircBuf(data);
  };

  return { readCircBuf, writeCircBuf, writeJSON };
};

export const makeSlogSender = async opts => {
  const { writeJSON } = await makeMemoryMappedCircularBuffer(opts);
  return writeJSON;
};
