const { freeze } = Object;

// a TextDecoder has mutable state; only export the (pure) decode function
/** @type { TextDecoder['decode'] } */
export const decode = (decoder => decoder.decode.bind(decoder))(
  new TextDecoder(),
);

/** @type { TextEncoder['encode'] } */
export const encode = (encoder => encoder.encode.bind(encoder))(
  new TextEncoder(),
);

/**
 * @param {string} url
 * @param {typeof import('fs').promises.readFile} [readFile]
 */
export function loader(url, readFile = undefined) {
  /** @param {string} ref */
  const resolve = ref => new URL(ref, url).pathname;
  return freeze({
    resolve,
    /**  @param {string} ref */
    // @ts-expect-error possibly undefined
    asset: async ref => readFile(resolve(ref), 'utf-8'),
  });
}

/**
 * @param {{
 *   spawn: typeof import('child_process').spawn,
 *   os: string,
 *   fs: import('fs'),
 *   tmpName: import('tmp')['tmpName'],
 * }} io
 * @returns {import('../src/xsnap.js').XSnapOptions & { messages: string[]}}
 */
export function options({ spawn, os, fs, tmpName }) {
  const messages = [];

  /** @param {Uint8Array} message */
  async function handleCommand(message) {
    messages.push(decode(message));
    return new Uint8Array();
  }

  return freeze({
    name: 'xsnap test worker',
    stderr: 'inherit',
    stdout: 'inherit',
    spawn,
    fs: { ...fs, ...fs.promises, tmpName },
    os,
    handleCommand,
    messages,
  });
}

/** @param {any} logs */
export const filterRepairLogs = logs => {
  // This flag and the filter below remove the SES Removing unpermitted
  // intrinsics warnings that sometimes occur when we upgrade XS ahead
  // of updating the SES intrinsics permits.
  let inGroup = false;
  return logs.filter(parts => {
    if (!Array.isArray(parts)) return true;
    if (parts.length < 1) return true;
    if (parts[0] === 'SES Removing unpermitted intrinsics') {
      inGroup = true;
      return false;
    }
    if (parts[0] === ' ' && inGroup) {
      return false;
    }
    inGroup = false;
    return true;
  });
};
