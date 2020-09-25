import {
  encode as nsEncode,
  streamDecoder as nsStreamDecoder,
} from './netstring';

/*
 * Accept an async iterable of Buffer chunks from a byte pipe. Produce an
 * async iterable of command arrays. This is effectively asyncMap(p =>
 * JSON.parse(p), if that were standardized
 */
export async function* streamDecoder(input) {
  for await (const p of nsStreamDecoder(input)) {
    if (!Buffer.isBuffer(p)) {
      throw Error('streamDecoder requires Buffers');
    }
    const c = JSON.parse(p);
    if (!Array.isArray(c)) {
      throw Error('streamDecoder expects Arrays');
    }
    yield c;
  }
}
harden(streamDecoder);

// return a function which accepts command arrays and writes
// netstring-encoded JSON-serialized arrays to the output

export function streamEncoder(output) {
  function write(command) {
    if (!Array.isArray(command)) {
      throw Error('streamEncoder requires Arrays');
    }
    output(nsEncode(Buffer.from(JSON.stringify(command))));
  }
  return write;
}
