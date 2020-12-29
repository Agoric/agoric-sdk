export function TextEncoder() {
  return harden({
    encode(_) {
      throw new Error('not impl');
    },
  });
}

export function TextDecoder() {
  return harden({
    decode(_) {
      throw new Error('not impl');
    },
  });
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
