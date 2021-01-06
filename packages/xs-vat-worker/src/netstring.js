// @ts-check

const COLON = ':'.charCodeAt(0);
const COMMA = ','.charCodeAt(0);

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * @param {AsyncIterable<Uint8Array>} input
 * @returns {AsyncIterableIterator<Uint8Array>} input
 */
export async function* reader(input, name = '<unknown>', capacity = 1024) {
  let length = 0;
  let buffer = new Uint8Array(capacity);
  let offset = 0;

  for await (const chunk of input) {
    if (length + chunk.byteLength >= capacity) {
      while (length + chunk.byteLength >= capacity) {
        capacity *= 2;
      }
      const replacement = new Uint8Array(capacity);
      replacement.set(buffer, 0);
      buffer = replacement;
    }
    buffer.set(chunk, length);
    length += chunk.byteLength;

    let drained = false;
    while (!drained && length > 0) {
      const colon = buffer.indexOf(COLON);
      if (colon === 0) {
        throw new Error(
          `Expected number before colon at offset ${offset} of ${name}`,
        );
      } else if (colon > 0) {
        const prefixBytes = buffer.subarray(0, colon);
        const prefixString = decoder.decode(prefixBytes);
        const contentLength = +prefixString;
        if (contentLength !== contentLength) {
          // NaN
          throw new Error(
            `Invalid netstring prefix length ${prefixString} at offset ${offset} of ${name}`,
          );
        }
        const messageLength = colon + contentLength + 2;
        if (messageLength <= length) {
          yield buffer.subarray(colon + 1, colon + 1 + contentLength);
          buffer.copyWithin(0, messageLength);
          length -= messageLength;
          offset += messageLength;
        } else {
          drained = true;
        }
      } else {
        drained = true;
      }
    }
  }

  if (length > 0) {
    throw new Error(
      `Unexpected dangling message at offset ${offset} of ${name}`,
    );
  }
}

/**
 * @param {AsyncIterator<void, void, Uint8Array>} output
 * @return {AsyncIterator<void, void, Uint8Array>}
 */
async function* writerGenerator(output) {
  const scratch = new Uint8Array(8);
  let length = 0;
  for (;;) {
    const message = yield;
    ({ written: length } = encoder.encodeInto(
      `${message.byteLength}`,
      scratch,
    ));
    scratch[length] = COLON;
    await output.next(scratch.subarray(0, length + 1));
    await output.next(message);
    scratch[0] = COMMA;
    await output.next(scratch.subarray(0, 1));
  }
}

/**
 * @param {AsyncIterator<void, void, Uint8Array>} output
 * @return {AsyncIterator<void, void, Uint8Array>}
 */
export function writer(output) {
  const wrapped = writerGenerator(output);
  wrapped.next(); // Advance to first yield.
  return wrapped;
}

// (async () => {
//   const w = writer(nodeWriter(process.stdout));
//   for (let i = 0; i < 20; i++) {
//     await w.next(new TextEncoder().encode(new Array(Math.floor(Math.random() * 10)).fill('hello').join('')));
//   }
//   await w.return();
//   const r = reader([
//     encoder.encode('1:A,'),
//     encoder.encode('5:hello,5:hello,'),
//     encoder.encode('5:hel'),
//     encoder.encode('lo,'),
//   ], '<unknown>', 1);
//   for await (const chunk of r) {
//     console.log(decoder.decode(chunk));
//   }
// })();
