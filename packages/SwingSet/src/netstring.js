// adapted from 'netstring-stream', https://github.com/tlivings/netstring-stream/

const COLON = 58;
const COMMA = 44;

// input is a Buffer, output is a netstring-wrapped Buffer
export function encode(data) {
  const prefix = Buffer.from(`${data.length}:`);
  const suffix = Buffer.from(',');
  return Buffer.concat([prefix, data, suffix]);
}

// Input is a Buffer containing zero or more netstrings and maybe some
// leftover bytes. Output is zero or more decoded Buffers, one per netstring,
// plus a Buffer of leftover bytes.
//
export function decode(data) {
  // TODO: it would be more efficient to accumulate pending data in an array,
  // rather than doing a concat each time
  let start = 0;
  const payloads = [];

  for (;;) {
    const colon = data.indexOf(COLON, start);
    if (colon === -1) {
      break; // still waiting for `${LENGTH}:`
    }
    const sizeString = data.toString('utf-8', start, colon);
    const size = parseInt(sizeString, 10);
    if (!(size > -1)) {
      // reject NaN, all negative numbers
      throw Error(`unparseable size '${sizeString}', should be integer`);
    }
    if (data.length < colon + 1 + size + 1) {
      break; // still waiting for `${DATA}.`
    }
    if (data[colon + 1 + size] !== COMMA) {
      throw Error(`malformed netstring: not terminated by comma`);
    }
    payloads.push(data.subarray(colon + 1, colon + 1 + size));
    start = colon + 1 + size + 1;
  }

  const leftover = data.subarray(start);
  return { leftover, payloads };
}

/*
 * accept an async iterable of Buffer chunks from a byte pipe. produce an
 * async iterable of payloads
 */
export async function* streamDecoder(input) {
  let leftover = Buffer.from('');
  let payloads;

  for await (const chunk of input) {
    if (!Buffer.isBuffer(chunk)) {
      throw Error('streamDecoder requires Buffers');
    }
    ({ leftover, payloads } = decode(Buffer.concat([leftover, chunk])));
    while (payloads.length) {
      yield payloads.shift();
    }
  }
}

// we must harden this function, else the generators it creates cannot be
// hardened (their prototype would not already be in the fringeset)
harden(streamDecoder);
