/* eslint-disable no-bitwise */
/**
 * Engine-agnostic core for the hex-decode benchmark. Defines the two decoders
 * under test, a deterministic input-corpus builder, and a timed decode loop,
 * all attached to `globalThis.hexbench`.
 *
 * This file has NO imports and uses only ES features that both V8 (Node) and
 * XS (xsnap) accept, so the identical source runs on both engines: the Node
 * runner evaluates it in-process, and the XS runner feeds the same text to a
 * prebuilt xsnap-worker over the netstring protocol.
 *
 * IMPORTANT: no `flatMap` anywhere. PR #7 exists because building the decoder
 * table with `encodings.flatMap(...) -> new Map(...)` materializes ~1024 live
 * pair-arrays and overflows the XS metered value stack. Every table and corpus
 * here is built with a bounded `for` loop so the benchmark cannot reintroduce
 * the very hazard it measures.
 */

/* global globalThis */

(() => {
  // --- The two approaches under test -------------------------------------

  // Agoric-internal "accelerator": a Map keyed by the 2-char hex string, with
  // all four lower/UPPER permutations of every byte pre-inserted. Mirrors
  // packages/internal/src/hex.js makePortableHexCodec at commit 47b701c.
  const buildMapDecoder = () => {
    const encodings = [];
    for (let b = 0; b < 256; b += 1) {
      let s = b.toString(16);
      if (s.length < 2) s = `0${s}`;
      encodings.push(s);
    }
    const decodings = new Map();
    for (let b = 0; b < 256; b += 1) {
      const hexdigits = encodings[b];
      const lo = hexdigits.toLowerCase();
      const UP = hexdigits.toUpperCase();
      decodings.set(lo, b);
      decodings.set(`${lo[0]}${UP[1]}`, b);
      decodings.set(`${UP[0]}${lo[1]}`, b);
      decodings.set(UP, b);
    }
    return { encodings, decodings };
  };

  // Map lookup by 2-char hex slice (the accelerator decode path).
  const mapDecodeHex = (decodings, hex) => {
    const inputLen = hex.length;
    if (inputLen % 2 !== 0) {
      throw new Error(`Invalid hex string: ${hex}`);
    }
    const buf = new Uint8Array(inputLen / 2);
    for (let i = 0; i < inputLen; i += 2) {
      const b = decodings.get(hex.slice(i, i + 2));
      if (b === undefined) {
        throw new Error(`Invalid hex string: ${hex}`);
      }
      buf[i >> 1] = b;
    }
    return buf;
  };

  // Endo @endo/hex jsDecodeHex: pure charCodeAt nibble arithmetic, no table.
  // Verbatim algorithm from packages/hex/src/decode.js.
  const arithDecodeHex = string => {
    if (string.length % 2 !== 0) {
      throw new Error(
        `Hex string must have an even length, got ${string.length}`,
      );
    }
    const bytes = new Uint8Array(string.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      const cHi = string.charCodeAt(i * 2);
      const cLo = string.charCodeAt(i * 2 + 1);
      let hi = -1;
      if (cHi >= 48 && cHi <= 57) {
        hi = cHi - 48;
      } else {
        const x = cHi | 0x20;
        if (x >= 97 && x <= 102) hi = x - 87;
      }
      let lo = -1;
      if (cLo >= 48 && cLo <= 57) {
        lo = cLo - 48;
      } else {
        const x = cLo | 0x20;
        if (x >= 97 && x <= 102) lo = x - 87;
      }
      if (hi < 0 || lo < 0) {
        throw new Error(
          `Invalid hex character at offset ${hi < 0 ? i * 2 : i * 2 + 1}`,
        );
      }
      bytes[i] = (hi << 4) | lo;
    }
    return bytes;
  };

  // A third design the report weighs: a 256-entry charCode -> nibble lookup
  // table held in a Uint8Array (0xff marks invalid). No Map, no per-byte
  // string slice/hash, and indexing a small typed array is a cheap native op
  // on both V8 and XS. Built with a bounded loop (no flatMap).
  const nibbleLut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) nibbleLut[i] = 0xff;
  for (let c = 48; c <= 57; c += 1) nibbleLut[c] = c - 48; // '0'-'9'
  for (let c = 97; c <= 102; c += 1) nibbleLut[c] = c - 87; // 'a'-'f'
  for (let c = 65; c <= 70; c += 1) nibbleLut[c] = c - 55; // 'A'-'F'

  const lutDecodeHex = string => {
    if (string.length % 2 !== 0) {
      throw new Error(`odd length ${string.length}`);
    }
    const bytes = new Uint8Array(string.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      const cHi = string.charCodeAt(i * 2);
      const cLo = string.charCodeAt(i * 2 + 1);
      const hi = cHi < 256 ? nibbleLut[cHi] : 0xff;
      const lo = cLo < 256 ? nibbleLut[cLo] : 0xff;
      if (hi === 0xff || lo === 0xff) {
        throw new Error(
          `invalid hex char at ${hi === 0xff ? i * 2 : i * 2 + 1}`,
        );
      }
      bytes[i] = (hi << 4) | lo;
    }
    return bytes;
  };

  // --- Deterministic corpus (no Math.random, no flatMap) -----------------

  // A small LCG so both engines and every run see byte-for-byte identical
  // inputs. Seed in, pseudo-random bytes out.
  const makeBytes = (n, seed) => {
    const out = new Uint8Array(n);
    let s = seed >>> 0;
    for (let i = 0; i < n; i += 1) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      out[i] = (s >>> 16) & 0xff;
    }
    return out;
  };

  const toHexLower = (bytes, encodings) => {
    let acc = '';
    for (let i = 0; i < bytes.length; i += 1) {
      acc += encodings[bytes[i]];
    }
    return acc;
  };

  // lower | upper | mixed. "mixed" alternates case per character so every
  // decode exercises a different one of the Map's four permutations and the
  // arithmetic decoder's `| 0x20` case fold.
  const caseVariant = (hexLower, mode) => {
    if (mode === 'lower') return hexLower;
    if (mode === 'upper') return hexLower.toUpperCase();
    let out = '';
    for (let i = 0; i < hexLower.length; i += 1) {
      const c = hexLower[i];
      out += i % 2 === 0 ? c.toUpperCase() : c.toLowerCase();
    }
    return out;
  };

  // --- State + entry points ----------------------------------------------

  const { encodings, decodings } = buildMapDecoder();
  const corpus = Object.create(null);

  const api = {
    tableSize: decodings.size,

    // Build and store one corpus string under `key`, outside any timed loop.
    makeCorpus: (key, nbytes, mode, seed) => {
      const bytes = makeBytes(nbytes, seed);
      const hex = caseVariant(toHexLower(bytes, encodings), mode);
      corpus[key] = hex;
      return hex.length;
    },

    // Confirm both decoders agree with each other (and that they actually
    // decode the bytes the corpus was built from) before any timing. Returns
    // 'OK' or throws.
    checkCorrectness: (key, nbytes, seed) => {
      const expected = makeBytes(nbytes, seed);
      const hex = corpus[key];
      const a = mapDecodeHex(decodings, hex);
      const b = arithDecodeHex(hex);
      const c = lutDecodeHex(hex);
      if (
        a.length !== expected.length ||
        b.length !== expected.length ||
        c.length !== expected.length
      ) {
        throw new Error(`length mismatch on ${key}`);
      }
      for (let i = 0; i < expected.length; i += 1) {
        if (a[i] !== expected[i])
          throw new Error(`map decode wrong at ${i} on ${key}`);
        if (b[i] !== expected[i])
          throw new Error(`arith decode wrong at ${i} on ${key}`);
        if (c[i] !== expected[i])
          throw new Error(`lut decode wrong at ${i} on ${key}`);
      }
      return 'OK';
    },

    // The timed kernel. `approach` is 'map' | 'arith' | 'empty'. 'empty' is a
    // loop that touches the corpus but does not decode, to measure call/loop
    // overhead that is subtracted out of the XS metered numbers. Returns a
    // checksum so neither engine can eliminate the loop as dead code.
    decodeLoop: (approach, key, iters) => {
      const hex = corpus[key];
      let sink = 0;
      if (approach === 'map') {
        for (let k = 0; k < iters; k += 1) {
          const out = mapDecodeHex(decodings, hex);
          sink = (sink + out[0] + out[out.length - 1]) & 0xffff;
        }
      } else if (approach === 'arith') {
        for (let k = 0; k < iters; k += 1) {
          const out = arithDecodeHex(hex);
          sink = (sink + out[0] + out[out.length - 1]) & 0xffff;
        }
      } else if (approach === 'lut') {
        for (let k = 0; k < iters; k += 1) {
          const out = lutDecodeHex(hex);
          sink = (sink + out[0] + out[out.length - 1]) & 0xffff;
        }
      } else {
        for (let k = 0; k < iters; k += 1) {
          sink = (sink + hex.length + hex.charCodeAt(0)) & 0xffff;
        }
      }
      return sink;
    },
  };

  globalThis.hexbench = api;
})();
