// @ts-nocheck
/* eslint-disable */
// import '@endo/init';
// import { E } from '@endo/far';
import fs from 'fs';
import zlib from 'zlib';
import process from 'process';
import sqlite3 from 'better-sqlite3';

// super-experimental tool to parse an XS heap snapshot file (as
// extracted from kerneldb by extract-snapshot.js) and populate a
// sqlite DB with its contents for later perusal. I have probably
// misunderstood a lot about the format, and there are definitely some
// fencepost errors that corrupt the relationships between slots and
// the things they reference. Run this like:
//
// node misc-tools/ingest-xs-snapshot.js v6-2-b2ed...xss output.sqlite
// sqlite3 output.sqlite .schema

function makeDB(dbfn) {
  const db = sqlite3(dbfn);
  db.exec(`PRAGMA journal_mode=WAL`);
  // these tables hold the snapshot contents more-or-less verbatim
  db.exec(`CREATE TABLE chunk (chunk BLOB)`);
  db.exec(
    `CREATE TABLE chunks (chunkIndex INTEGER, offset INTEGER, chunk BLOB, PRIMARY KEY (offset))`,
  );
  db.exec(
    `CREATE TABLE slots (slotID INTEGER, kind STRING, flag INTEGER, id INTEGER, next INTEGER, ` +
      `fieldsJSON STRING, slotFieldsJSON STRING, chunkFieldsJSON STRING, ` +
      `PRIMARY KEY (slotID))`,
  );
  db.exec(`CREATE INDEX slots_kind ON slots (kind, slotID)`);
  db.exec(`CREATE INDEX slots_next ON slots (next)`);
  db.exec(`CREATE INDEX slots_id ON slots (id)`);
  db.exec(
    `CREATE TABLE stack (stackID INTEGER, slotID INTEGER, PRIMARY KEY (stackID))`,
  );
  db.exec(
    `CREATE TABLE keys (keyID INTEGER, slotID INTEGER, isSymbol BOOL, string STRING, PRIMARY KEY (keyID))`,
  );
  db.exec(
    `CREATE TABLE nameBuckets (hash INTEGER, slotID INTEGER, PRIMARY KEY (hash))`,
  );
  db.exec(
    `CREATE TABLE symbolBuckets (hash INTEGER, slotID INTEGER, PRIMARY KEY (hash))`,
  );
  // these tables hold parsed results, for easier lookup
  db.exec(
    `CREATE TABLE strings (slotID INTEGER, string STRING, PRIMARY KEY (slotID))`,
  );
  db.exec(`CREATE INDEX strings_string ON strings (string)`);
  db.exec(`CREATE TABLE refs (slotID INTEGER, refID INTEGER)`);
  db.exec(`CREATE INDEX refs_slotID ON refs (slotID)`);
  db.exec(`CREATE INDEX refs_refID ON refs (refID)`);

  // comment this out to preserve a partial DB if the ingest process
  // throws an error, but it runs much more slowly because it will
  // auto-commit after every statement
  db.prepare('BEGIN IMMEDIATE TRANSACTION').run();

  const sql = { db };
  sql.sqlAddChunk = db.prepare(
    'INSERT INTO chunks (chunkIndex, offset, chunk) VALUES (?,?,?)',
  );
  sql.sqlGetChunk = db.prepare('SELECT chunk FROM chunks WHERE offset=?');
  sql.sqlGetChunk.pluck(true);
  sql.getStringChunk = chunkOffset => {
    const chunkData = sql.sqlGetChunk.get(chunkOffset);
    const stripped = chunkData.slice(0, chunkData.indexOf(0));
    const string = Buffer.from(stripped).toString('utf-8');
    return string;
  };
  sql.sqlAddSlot = db.prepare(
    'INSERT INTO slots ' +
      '(slotID, kind, flag, id, next,' +
      ' fieldsJSON, slotFieldsJSON, chunkFieldsJSON)' +
      ' VALUES (?,?,?,?,?,?,?,?)',
  );
  sql.sqlGetSlot = db.prepare('SELECT * FROM slots WHERE slotID=?'); // no pluck
  sql.sqlAddStack = db.prepare(
    'INSERT INTO stack (stackID, slotID) VALUES (?,?)',
  );
  sql.sqlAddKey = db.prepare(
    'INSERT INTO keys (keyID, slotID, isSymbol, string) VALUES (?,?,?,?)',
  );
  sql.sqlAddNameBucket = db.prepare(
    'INSERT INTO nameBuckets (hash, slotID) VALUES (?,?)',
  );
  sql.sqlAddSymbolBucket = db.prepare(
    'INSERT INTO symbolBuckets (hash, slotID) VALUES (?,?)',
  );

  sql.sqlAddString = db.prepare(
    'INSERT INTO strings (slotID, string) VALUES (?,?)',
  );
  sql.sqlGetString = db.prepare('SELECT `string` FROM strings WHERE slotID=?');
  sql.sqlGetString.pluck(true);
  sql.sqlAddReference = db.prepare(
    'INSERT INTO refs (slotID, refID) VALUES (?,?)',
  );

  return { db, sql };
}

const LITTLE_ENDIAN = true;
const BIG_ENDIAN = false;
// the XS snapshot format uses big-endian ("network order") size
// fields, but most of the data is a raw copy of the C structures, and
// thus uses host order. A flag in the 'version' field records both
// host order (positive for LE, negative for BE), and the size of a
// txSlot (32 for our 64-bit platform)
const HOST_ENDIAN = LITTLE_ENDIAN;

const readU32LE = (buffer, offset = 0) =>
  new DataView(buffer).getUint32(offset, LITTLE_ENDIAN);
const readU64LE = (buffer, offset = 0) => {
  // const little = (new DataView(buffer)).getUint32(offset, LITTLE_ENDIAN);
  // const big = (new DataView(buffer)).getUint32(offset+4, LITTLE_ENDIAN);
  // return big * (2**32) + little;
  return Number(new DataView(buffer).getBigUint64(offset, LITTLE_ENDIAN));
};

const makeReader = fn => {
  let s = fs.createReadStream(fn);
  if (fn.endsWith('.gz')) {
    s = s.pipe(zlib.createGunzip());
  }

  let total_offset = 0;
  let offset = 0;
  let buffered = new Uint8Array(0);
  let skipping; // set to N, to skip the next N bytes
  const available = () => buffered.length - offset;

  async function* makePump() {
    for await (const chunk of s) {
      // console.log(`pump: old ${offset}/${buffered.length}, new ${chunk.length}`);
      // console.log(`  chunk:`, chunk);
      const remaining = buffered.length - offset;
      const bigger = new Uint8Array(remaining + chunk.length);
      // copy the remaining buffer into bigger
      bigger.set(buffered.slice(offset), 0);
      bigger.set(chunk, remaining);
      buffered = bigger;
      total_offset += offset;
      offset = 0;
      // parse starting from buffered[offset]
      // console.log(`  yield +${chunk.length} now ${available()}`);
      // console.log(buffered);
      yield chunk.length; // how much new data became available
    }
    throw Error('EOF');
  }
  const pump = makePump();

  const gather = async needed => {
    while (available() < needed) {
      await pump.next(); // throws if we hit EOF
    }
    const data = buffered.slice(offset, offset + needed);
    offset += needed;
    return data;
  };

  const readBE4 = async () => {
    const bytes = await gather(4);
    // the format uses a big-endian ("network-order") size field for
    // the iniital (overall) size, and at the beginning of each
    // section
    return new DataView(bytes.buffer).getUint32(0, BIG_ENDIAN);
  };

  const readTag = async () => {
    const bytes = await gather(4);
    return Buffer.from(bytes).toString('ascii');
  };

  const skipN = async count => {
    await gather(count); // TODO no, obviously
  };

  const startSection = async expected_tag => {
    const size = await readBE4();
    const tag = await readTag();
    if (tag !== expected_tag) {
      throw Error(`wanted section ${expected_tag}, got ${tag} instead`);
    }
    const section_size = size - 4 - 4; // removing size and header fields
    console.log(
      `startSection ${tag}, size=${size}, section_size=${section_size} = 32*${
        section_size / 32
      }`,
    );
    let remaining = section_size;

    const readN = len => {
      if (len > remaining) {
        throw Error(`asked for ${len} from ${tag} but only ${remaining} left`);
      }
      const data = gather(len);
      remaining -= len;
      // console.log(` readN(${len}), remaining ${remaining+len} -> ${remaining}`);
      return data;
    };

    const readByte = async () => {
      const bytes = await readN(1);
      return bytes[0];
    };

    const readS1 = async () => {
      const bytes = await readN(1);
      return new DataView(bytes.buffer).getInt8(0);
    };

    const readLE4 = async () => {
      const bytes = await readN(4);
      // the 'creation' (CREA) section is a raw dump of a C 'struct
      // sx_creation', so it uses host byte order, and all computers
      // are little-endian these days
      return new DataView(bytes.buffer).getUint32(0, LITTLE_ENDIAN);
    };

    const readAll = () => readN(remaining);

    async function* iterN(unitSize) {
      while (remaining >= unitSize) {
        yield readN(unitSize);
      }
      if (remaining !== 0) {
        throw Error(
          `done with ${tag} iterN(${unitSize}), but odd ${remaining} left`,
        );
      }
    }

    const skipSection = async () => {
      if (!remaining) return;
      await skipN(remaining);
      remaining = 0;
    };

    const getRemaining = () => remaining;

    return {
      readN,
      readByte,
      readS1,
      readLE4,
      readAll,
      iterN,
      getRemaining,
      skipSection,
    };
  };

  return { readBE4, readTag, skipN, startSection };
};

async function readVersion(r) {
  const s = await r.startSection('VERS');
  const major = await s.readByte(1);
  const minor = await s.readByte(1);
  const patch = await s.readByte(1);
  const endianValue = await s.readS1();
  await s.skipSection();
  let endian;
  if (endianValue === 32) {
    endian = 'le32'; // 32: size of txSlot
  } else {
    throw Error(`unhandled endian value: ${endianValue}`);
  }
  return { major, minor, patch, endian };
}

async function readCreation(r) {
  const s = await r.startSection('CREA');
  const initialChunkSize = await s.readLE4();
  const incrementalChunkSize = await s.readLE4();
  const initialHeapCount = await s.readLE4();
  const incrementalHeapCount = await s.readLE4();
  const stackCount = await s.readLE4();
  const keyCount = await s.readLE4();
  const nameModulo = await s.readLE4();
  const symbolModulo = await s.readLE4();
  const parserBufferSize = await s.readLE4();
  const parserTableModulo = await s.readLE4();
  const staticSize = await s.readLE4();
  await s.skipSection();
  return {
    initialChunkSize,
    incrementalChunkSize,
    initialHeapCount,
    incrementalHeapCount,
    stackCount,
    keyCount,
    nameModulo,
    symbolModulo,
    parserBufferSize,
    parserTableModulo,
    staticSize,
  };
}

// parsed from xsAll.h, look for XS_STRING_KIND
const ALL_KINDS = [
  'UNDEFINED', // 0
  'NULL',
  'BOOLEAN',
  'INTEGER',
  'NUMBER',
  'STRING', // 5
  'STRING_X',
  'SYMBOL',
  'BIGINT',
  'BIGINT_X',
  'REFERENCE', // 10
  'CLOSURE',
  'FRAME',
  'INSTANCE',
  'ARGUMENTS_SLOPPY',
  'ARGUMENTS_STRICT', // 15
  'ARRAY',
  'ARRAY_BUFFER',
  'CALLBACK',
  'CODE',
  'CODE_X', // 20
  'DATE',
  'DATA_VIEW',
  'FINALIZATION_CELL',
  'FINALIZATION_REGISTRY',
  'GLOBAL', // 25
  'HOST',
  'MAP',
  'MODULE',
  'PROGRAM',
  'PROMISE', // 30
  'PROXY',
  'REGEXP',
  'SET',
  'TYPED_ARRAY',
  'WEAK_MAP', // 35
  'WEAK_REF',
  'WEAK_SET',
  'ACCESSOR',
  'AT',
  'ENTRY', // 40
  'ERROR',
  'HOME',
  'KEY',
  'KEY_X',
  'LIST', // 45
  'PRIVATE',
  'STACK',
  'VAR',
  'CALLBACK_X',
  // #ifdef mxHostFunctionPrimitive  // probably true?
  'HOST_FUNCTION',
  // #endif
  'HOST_INSPECTOR',
  'INSTANCE_INSPECTOR',
  'EXPORT',
  'WEAK_ENTRY',
  'BUFFER_INFO',
  'MODULE_SOURCE',
  'IDS',
];
const KIND = {};
ALL_KINDS.map((name, index) => (KIND[index] = name));

function parseSlot(slotID, buffer) {
  const get8 = offset => readU64LE(buffer, offset);
  const get4 = offset => new DataView(buffer).getUint32(offset, LITTLE_ENDIAN);
  const get2 = offset => new DataView(buffer).getUint16(offset, LITTLE_ENDIAN);
  const get1 = offset => new DataView(buffer).getUint8(offset, LITTLE_ENDIAN);
  const getS4 = offset => new DataView(buffer).getInt32(offset, LITTLE_ENDIAN);
  const getF64 = offset =>
    new DataView(buffer).getFloat64(offset, LITTLE_ENDIAN);

  // these fields are in common for all slot types
  const next = get4(0);
  const kindID = get1(8);
  const kind = KIND[kindID] || `<unknown kind ${kindID}>`;
  const flag = get1(9);
  const id = get4(12);

  // the .value portion is 16 bytes that contain a union of many
  // per-kind types, but many of them use one or two slots/chunks, so
  // parse them now for convenience
  const ptr1 = get8(16);
  const ptr2 = get8(24);

  const fields = {};
  const slotFields = {};
  const chunkFields = {};

  // UNINITIALIZED, UNDEFINED, NULL : no additional fields
  if (kind === 'BOOLEAN') fields.boolean = getS4(16);
  if (kind === 'INTEGER') fields.integer = getS4(16);
  if (kind === 'NUMBER') fields.number = getF64(16);
  if (kind === 'STRING') chunkFields.stringChunk = get4(16);
  if (kind === 'SYMBOL') fields.symbolID = get4(16);
  if (kind === 'BIGINT') {
    chunkFields.bigintChunk = get4(16);
    fields.size = get2(24);
    fields.sign = get1(26);
  }
  if (kind === 'REFERENCE') slotFields.reference = ptr1;
  if (kind === 'CLOSURE') slotFields.closure = ptr1;
  if (kind === 'INSTANCE') slotFields.prototype = ptr2; // offset[16] is '.garbage'
  if (
    kind === 'ARRAY' ||
    kind === 'ARGUMENTS_SLOPPY' ||
    kind === 'ARGUMENTS_STRICT' ||
    kind === 'STACK'
  ) {
    chunkFields.address = ptr1;
    fields.length = get4(24);
  }
  if (kind === 'ARRAY_BUFFER') chunkFields.address = ptr1;
  if (kind === 'BUFFER_INFO') {
    fields.length = get4(16);
    fields.maxLength = get4(20);
  }
  if (kind === 'CALLBACK') fields.index = ptr1; // callbackIndex
  if (kind === 'CODE') {
    chunkFields.address = ptr1;
    slotFields.closures = ptr2;
  }
  if (kind === 'DATE') fields.number = getF64(16);
  if (kind === 'DATA_VIEW') {
    fields.offset = getS4(16);
    fields.size = getS4(20);
  }
  if (kind === 'FINALIZATION_CELL') {
    slotFields.target = ptr1;
    slotFields.token = ptr2;
  }
  if (kind === 'FINALIZATION_REGISTRY') {
    slotFields.callback = ptr1;
    fields.flags = get4(24);
  }
  if (kind === 'TYPED_ARRAY') {
    fields.typeDispatch = ptr1;
    fields.typeAtomics = ptr2;
  }
  if (kind === 'GLOBAL' || kind === 'MAP' || kind === 'SET') {
    chunkFields.address = ptr1;
    fields.length = getS4(24);
  }
  if (kind === 'WEAK_MAP' || kind === 'WEAK_SET') {
    slotFields.first = ptr1;
    slotFields.link = ptr2;
  }
  if (kind === 'WEAK_ENTRY') {
    slotFields.check = ptr1;
    slotFields.value = ptr2;
  }
  if (kind === 'WEAK_REF') {
    slotFields.target = ptr1;
    slotFields.link = ptr2;
  }
  if (kind === 'MODULE' || kind === 'PROGRAM' || kind === 'MODULE_SOURCE') {
    slotFields.realm = ptr1;
    fields.id = get4(24);
  }
  if (kind === 'PROMISE') fields.integer = getS4(16);
  if (kind === 'PROXY') {
    slotFields.handler = ptr1;
    slotFields.target = ptr2;
  }
  if (kind === 'REGEXP') {
    chunkFields.code = ptr1;
    chunkFields.data = ptr2;
  }
  if (kind === 'ACCESSOR') {
    slotFields.getter = ptr1;
    slotFields.setter = ptr2;
  }
  if (kind === 'AT') {
    fields.index = get4(16);
    fields.id = get4(20);
  }
  if (kind === 'ENTRY') {
    slotFields.slot = ptr1;
    fields.sum = get4(24);
  }
  if (kind === 'ERROR') {
    slotFields.info = ptr1;
    fields.which = getS4(24);
  }
  if (kind === 'HOME') {
    slotFields.object = ptr1;
    slotFields.module = ptr2;
  }
  if (kind === 'KEY' || kind === 'KEY_X') {
    chunkFields.string = ptr1;
    fields.sum = get4(24);
  }
  if (kind === 'LIST') {
    slotFields.first = ptr1;
    slotFields.last = ptr2;
  }
  if (kind === 'PRIVATE') {
    slotFields.check = ptr1;
    slotFields.first = ptr2;
  }
  if (kind === 'EXPORT') {
    slotFields.closure = ptr1;
    slotFields.module = ptr2;
  }
  if (kind === 'FRAME') {
  } // XXX writeSnapshot just nulls out .next
  if (kind === 'HOST') chunkFields.data = ptr1; // XXX read is unit of desritor|hooks, nulled on write

  // console.log(`slot ${slotID}: f${flag} ${kind} id ${id}, next ${next}`, fields, slotFields, chunkFields);
  // .next: host=LE 8 bytes, projected slot index: HEAP[32*i]
  // .id:   host=LE 4 bytes, txID field
  // .flag:         1 byte
  // .kind:         1 byte
  // .value: 16 bytes, depends on .kind

  return { slotID, kind, flag, id, next, fields, slotFields, chunkFields };
}

function saveSlot(parsed, sql) {
  // save additional data extracted from the slot structure
  const { slotID, kind, fields, slotFields, chunkFields } = parsed;
  if (slotID === 10002) console.log(`--`, parsed);
  if (parsed.kind === 'STRING') {
    const string = sql.getStringChunk(chunkFields.stringChunk);
    sql.sqlAddString.run(parsed.slotID, string);
    // console.log(`STRING s${parsed.slotID}: ${chunkS}`);
    // sqlite3 t.sqlite 'SELECT string FROM strings WHERE slotID=1234' | base64 -d >t.zip
  } else if (parsed.kind === 'ARRAY') {
    /*
    const { length } = fields;
    console.log(`ARRAY ${slotID} length=${length}`);
    const backing = sql.sqlGetChunk.get(chunkFields.address);
    if (length) {
      const get8 = offset => readU64LE(backing.buffer, offset);
      for (let offset = 8; offset < backing.length; offset += 8) {
        const elementID = get8(offset);
        console.log(`ARRAY ${slotID} [${offset/8-1}]:`, elementID);
      }
    }
    */
  } else if (parsed.kind === 'REFERENCE') {
    const refID = slotFields.reference;
    sql.sqlAddReference.run(slotID, refID);
  }

  // .. handle all kinds here
}

async function run() {
  const args = process.argv.slice(2);
  const ssfn = args[0];
  const r = makeReader(ssfn);

  const dbfn = args[1];
  const { db, sql } = makeDB(dbfn);

  console.log(`total_len:`, await r.readBE4());
  console.log(`XS_M:`, await r.readTag());
  // const version = await r.startSection('VERS').then(s => s.readAll());
  const version = await readVersion(r);
  console.log(`version:`, version);
  const signature = await r.startSection('SIGN').then(s => s.readAll());
  console.log(`signature:`, signature);
  // const creation = await r.startSection('CREA').then(s => s.readAll());
  // const creation = await E(E(r).startSection('CREA')).readAll();
  const creation = await readCreation(r);
  console.log(`creation:`, creation);

  const chunks = await r.startSection('BLOC');
  if (false) {
    const chunkData = await chunks.readAll();
    console.log(`read ${chunkData.length} bytes of chunks`);
    db?.prepare('INSERT INTO chunk (chunk) VALUES (?)').run(chunkData);
    console.log(chunkData.slice(0, 64));
  } else {
    let chunkIndex = 0;
    let offset = 0;
    while (chunks.getRemaining()) {
      const sizebuf = await chunks.readN(8);
      offset += 8;
      const size = readU64LE(sizebuf.buffer);
      await chunks.readN(8); // padding
      offset += 8;
      // note: data is actually smaller, 'size' is rounded up, actual
      // size is not stored here, context dictates. STRING_KIND slots
      // expect NUL-terminated UTF-8 string, and 'size' always
      // includes space for the NUL.
      const data = await chunks.readN(size - 8 - 8);
      // console.log(chunkIndex, Buffer.from(data).toString('ascii'));
      sql?.sqlAddChunk.run(chunkIndex, offset, data);
      offset += size - 8 - 8;
      chunkIndex += 1;
    }
    console.log(` ingest ${chunkIndex} chunks`);
  }

  // sqlite3 t.sqlite '.binary on' '.mode quite' 'SELECT chunk FROM chunk' -> X'hexhexhex'
  // sqlite3 t.sqlite 'SELECT writefile("blob.bin",chunk) FROM chunk' -> blob.bin has raw data
  const slots = await r.startSection('HEAP');
  let slotID = 1; // slotID=0 is reserved
  for await (const slotBuffer of slots.iterN(32)) {
    const parsed = parseSlot(slotID, slotBuffer.slice(0, 32).buffer);
    slotID += 1;
    const fieldsJSON = JSON.stringify(parsed.fields);
    const slotFieldsJSON = JSON.stringify(parsed.slotFields);
    const chunkFieldsJSON = JSON.stringify(parsed.chunkFields);
    sql?.sqlAddSlot.run(
      parsed.slotID,
      parsed.kind,
      parsed.flag,
      parsed.id,
      parsed.next,
      fieldsJSON,
      slotFieldsJSON,
      chunkFieldsJSON,
    );
    saveSlot(parsed, sql);
  }
  console.log(` ingest ${slotID} slots`);

  const stack = await r.startSection('STAC');
  // const stackData = await stack.readAll();
  // console.log(`stackData`, stackData);

  let stackID = 0;
  while (stack.getRemaining()) {
    const slotBuf = await stack.readN(8);
    const slotID = readU64LE(await slotBuf.buffer);
    sql?.sqlAddStack.run(stackID, slotID);
    stackID += 1;
  }

  // KEYS: map keyID to string slots

  // In XS, each non-numeric object property key is assigned an ID (a
  // 32-bit integer) for performance. Symbol keys are assigned IDs
  // from the same numberspace. When XS needs to turn an ID back into
  // a string (either the string key, or a description of the symbol
  // key), it looks up the->keyArray[ID]. The KEYS table holds the
  // non-empty contents of this keyArray, which lives in memory as a
  // fixed-size array of the->keyCount pointers (each a txSlot*), of
  // which the first the->keyIndex entries are full, and the rest are
  // empty. The snapshot encodes each one as a 8-byte LE integer, an
  // index into the slot table (HEAP), where we expect to find either
  // an XS_KEY_KIND (for string keys, which holds .id and
  // .value.key.string), or an XS_STRING_KIND (for symbol keys, which
  // holds the description of the Symbol)

  const keys = await r.startSection('KEYS');
  let keyID = 1; // 0 is reserved for XS_NO_ID
  for await (const slotBuffer of keys.iterN(8)) {
    const slotID = readU64LE(slotBuffer.buffer);
    // slot is always = keyID+1, because keyArray is indexed before
    // anything else. slot 0 is reserved for no-slot, and keyID=0
    // means to use a numeric-key index instead
    // console.log(`key ID ${keyID} -> slotID ${slotID}`);

    // the slot will point to a KEY_KIND
    if (sql.db) {
      const slotData = sql.sqlGetSlot.get(slotID);
      console.log(`key ${keyID} got slot ${slotID} with data`, slotData);
      const { kind, chunkFieldsJSON } = slotData;
      let isSymbol;
      let chunkOffset;
      if (kind === 'STRING') {
        // Symbol key, string is description
        isSymbol = true;
        chunkOffset = JSON.parse(chunkFieldsJSON).stringChunk;
      } else if (kind === 'KEY') {
        // string key
        isSymbol = false;
        chunkOffset = JSON.parse(chunkFieldsJSON).string;
      } else {
        // console.log(`--huh keyID ${keyID} slot ${slotID} was kind ${slotData.kind}, not STRING`);
        throw Error(
          `keyID ${keyID} slot ${slotID} was kind ${slotData.kind}, not STRING`,
        );
      }
      const string = chunkOffset ? sql.getStringChunk(chunkOffset) : undefined;
      // console.log(`sqlAddKey`, keyID, slotID, isSymbol, string);
      sql.sqlAddKey.run(keyID, slotID, Number(isSymbol), string);
    }
    keyID += 1;
  }
  console.log(` ingest ${keyID} keys`);

  // XS uses a standard hash table to map property-key names to
  // IDs. the->nameTable points to an array of the->nameModulo
  // buckets. Each bucket is either NULL or points to a txSlot of
  // XS_KEY_KIND, where .value.key.string is the name (a pointer to a
  // chunk), .id is the ID, and .next points to the next entry. The
  // snapshot encodes this as an array of nameModulo size, each entry
  // of which is either the slotID of that hash bucket's target, or
  // 0 for the empty buckets. The slots themselves are stored in the
  // HEAP section, so the nameTable doesn't need anything more than
  // the bucket heads.

  const names = await r.startSection('NAME');
  let bucketID = 0;
  for await (const slotBuffer of names.iterN(8)) {
    const slotID = readU64LE(slotBuffer.buffer);
    // console.log(`name hash-bucket[${bucketID}] = slotID ${slotID}`);
    sql?.sqlAddNameBucket.run(bucketID, slotID);
    bucketID += 1;
  }
  console.log(` ingest ${bucketID} nameTable bucket heads`);

  // XS also uses a hash table to map the names of registered symbols
  // to the KEY_KIND txSlot with the .id of the key. The slot also has
  // a pointer to the string chunk with the symbol's name, and a .next
  // to the remainder of the hash chain.

  const symbols = await r.startSection('SYMB');
  bucketID = 0;
  for await (const slotBuffer of symbols.iterN(8)) {
    const slotID = readU64LE(slotBuffer.buffer);
    if (slotID && sql) {
      const slotData = sql.sqlGetSlot.get(slotID);
      const { kind, chunkFieldsJSON } = slotData;
      const chunkOffset = JSON.parse(chunkFieldsJSON).string;
      const string = sql.getStringChunk(chunkOffset);
      console.log(
        ` symbol hash-bucket [${bucketID}] = slotID ${slotID}: ${string}`,
      );
    }
    sql?.sqlAddSymbolBucket.run(bucketID, slotID);
    bucketID += 1;
  }
  console.log(` ingest ${bucketID} symbolTable bucket heads`);

  if (db) console.log(`db.commit`);
  db?.prepare('COMMIT').run();
  if (db) console.log(`db WAL checkpoint`);
  db?.prepare('PRAGMA wal_checkpoint(FULL)').run();
}

process.exitCode = 1;
run().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
