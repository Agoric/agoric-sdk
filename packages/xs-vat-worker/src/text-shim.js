class TextEncoder {
    encode(x) {
        throw new Error('not impl');
    }
}

class TextDecoder {
    decode(x) {
        throw new Error('not impl');
    }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
