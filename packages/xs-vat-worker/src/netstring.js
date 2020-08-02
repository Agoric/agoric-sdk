export async function readNetstring(input) {
  let prefix = Buffer.from([]);
  let colonPos = -1;

  const nextChunk = () =>
    new Promise((resolve, _reject) => {
      const rx = data => {
        input.pause();
        input.removeListener('data', rx);
        resolve(data);
      };
      input.on('data', rx);
      input.resume();
    });

  while (colonPos < 0) {
    // eslint-disable-next-line no-await-in-loop
    const more = await nextChunk();
    prefix = Buffer.concat([prefix, more]);
    colonPos = prefix.indexOf(':');
  }
  let len;
  const digits = prefix.slice(0, colonPos).toString('utf-8');
  try {
    len = parseInt(digits, 10);
  } catch (badLen) {
    throw new Error(`bad netstring length ${digits}`);
  }
  // console.error('readNetstring parsed len', { digits, len });
  let data = prefix.slice(colonPos + 1);
  while (data.length <= len) {
    // console.log('netstring: looking for payload', data.length, len);
    // eslint-disable-next-line no-await-in-loop
    const more = await nextChunk(input);
    data = Buffer.concat([data, more]);
  }
  if (data.slice(len).toString('utf-8') !== ',') {
    throw new Error(
      `bad netstring: expected , got ${data.slice(-1)} [${data.slice(-20)}]`,
    );
  }
  return data.slice(0, len).toString('utf-8');
}

export async function writeNetstring(out, payload) {
  // ISSUE: non-ASCII length
  // console.log('kernelSimulator send size', content.length);
  await out.write(`${payload.length}:`);
  await out.write(payload);
  await out.write(',');
}
