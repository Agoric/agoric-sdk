// @ts-nocheck
import fs from 'fs';
import sqlite3 from 'better-sqlite3';

function ingestSwingSstore(datafile, swingstore_dbfn) {
  const ssdb = sqlite3(swingstore_dbfn);

  // object, not Map, so we can JSON-dump it when we're done
  const vats = {};
  function provideVat(vatID) {
    if (!vats[vatID]) {
      vats[vatID] = {
        collections: {},
        kinds: {},
        stats: {
          kv: { rows: 0, chars: 0 },
          clist: { rows: 0, chars: 0 },
          vatstore: { rows: 0, chars: 0 },
          vc: { rows: 0, chars: 0 },
          vom: {
            total: { rows: 0, chars: 0 },
            data: { rows: 0, chars: 0 },
            exportStatus: { rows: 0, chars: 0 },
            ir: { rows: 0, chars: 0 },
            rc: {
              total: { rows: 0, chars: 0 },
              imports: { rows: 0, chars: 0 },
              exports: {
                total: { rows: 0, chars: 0 },
                ephemeral: { rows: 0, chars: 0 },
                virtual: { rows: 0, chars: 0 },
                durable: { rows: 0, chars: 0 },
              },
            },
          },
        },
      };
    }
    return vats[vatID];
  }
  function provideCollection(vat, collectionID) {
    if (!vat.collections[collectionID]) {
      vat.collections[collectionID] = { entries: 0, ordinals: 0 };
    }
    return vat.collections[collectionID];
  }
  function provideKind(vat, kindID) {
    if (!vat.kinds[kindID]) {
      vat.kinds[kindID] = {
        exported: 0,
        referenced: 0,
        recognized: 0,
        defined: 0,
      };
    }
    return vat.kinds[kindID];
  }

  // note: this LIKE ought to be optimized into a SEARCH (prepend
  // "EXPLAIN QUERY PLAN" to the query and sqlite will tell you its best
  // strategy), but something is inhibiting the optimization, maybe
  // the column needs to be indexed as NOCASE.
  // https://www.sqlite.org/optoverview.html#the_like_optimization
  // const sqlVatNames = ssdb.prepare("SELECT * FROM kvStore WHERE key LIKE 'vat.name%'");

  const sqlVatNames = ssdb.prepare(
    "SELECT * FROM kvStore WHERE key > 'vat.' and key < 'vat/' and key LIKE 'vat.name%'",
  );
  const sqlGet = ssdb.prepare('SELECT value FROM kvStore WHERE key=?');
  const sqlAllKV = ssdb.prepare('SELECT * FROM kvStore');

  // We need to grab the `storeKindIDTable` for each vat first, so we
  // can recognize vrefs that describe collections of those types when
  // we see them in the vom.rc tables.
  const allVatIDs = [];
  const vatIDToCollectionKindIDs = {};

  for (const { key, value } of sqlVatNames.iterate()) {
    if (key.startsWith('vat.name.')) {
      allVatIDs.push(value);
    }
  }
  for (const vatID of JSON.parse(sqlGet.get('vat.dynamicIDs').value)) {
    allVatIDs.push(vatID);
  }

  for (const vatID of allVatIDs) {
    const vat = provideVat(vatID);
    const key = `${vatID}.vs.storeKindIDTable`;
    const row = sqlGet.get(key);
    if (!row) {
      continue; // non-liveslots vats (comms) lack storeKindIDTable
    }
    const table = JSON.parse(row.value);
    vat.storeTypeToKindID = table;
    vat.kindIDToStoreType = {};
    // the values of this table are integers, but the output of our
    // regexp will be strings, so convert them now
    const kids = new Set();
    vatIDToCollectionKindIDs[vatID] = kids;
    for (const [storeType, kindIDNumber] of Object.entries(table)) {
      vat.kindIDToStoreType[`${kindIDNumber}`] = storeType;
      kids.add(`${kindIDNumber}`);
    }
  }

  function gleanCollections(vatID, vref, vat) {
    // Liveslots doesn't store the CollectionID->KindID mapping
    // directly, so we glean it: if we observe o+dXX/YY, where XX is a
    // KindID that matches one of the collection types from
    // storeKindIDTable, then YY is a CollectionID.
    const r = /^o\+d(\d+)\/(\d+)/.exec(vref);
    // we don't anchor with $, because faceted vrefs end with :ZZ
    if (r) {
      const [kindID, collectionID] = r.slice(1);
      if (vatIDToCollectionKindIDs[vatID].has(kindID)) {
        const c = provideCollection(vat, collectionID);
        if (!c.kindID) {
          // console.log(`:gleaned ${vatID} k${kindID}->co${collectionID} from ${vref}`);
          c.kindID = kindID;
        }
      }
    }
  }

  for (const { key, value } of sqlAllKV.iterate()) {
    const r0 = /^(v\d+)\.(.*)/.exec(key);
    if (!r0) {
      continue;
    }
    const [vatID, vatsubkey] = r0.slice(1);
    const vat = provideVat(vatID);
    const stats = vat.stats;
    function incstat(stat, newRows = 1) {
      stat.rows += newRows;
      stat.chars += key.length + value.length;
    }
    incstat(stats.kv);

    if (vatsubkey.startsWith('c.')) {
      if (vatsubkey.startsWith('c.ko')) {
        // only count each pair once
        incstat(stats.clist);
      } else {
        incstat(stats.clist, 0);
      }
    }

    const r1 = /^vs\.(.*)/.exec(vatsubkey);
    if (!r1) {
      continue;
    }
    incstat(stats.vatstore);

    const [subkey] = r1.slice(1);
    // console.log(vatID, subkey, key);
    const r2 = /^vc\.(\d+)\.(.*)$/.exec(subkey);
    if (r2) {
      incstat(stats.vc); // entries, ordinals, and meta
      const [collectionID, csubkey] = r2.slice(1);
      // console.log(vatID, collectionID, csubkey, key);
      const c = provideCollection(vat, collectionID);
      if (csubkey === '|schemata') {
        c.schemata = value;
      } else if (csubkey === '|entryCount') {
        c.entryCount = Number(value);
      } else if (csubkey === '|nextOrdinal') {
        c.nextOrdinal = Number(value);
      } else if (csubkey.startsWith('|')) {
        // probably an ordinal mapping
        c.ordinals += 1;
      } else {
        c.entries += 1;
        if (!c.sample) {
          c.sample = [key, value];
        }
      }
    }
    const r3 = /^vom\.(.*)$/.exec(subkey);
    if (r3) {
      incstat(stats.vom.total);
      const [vsubkey] = r3.slice(1);
      if (vsubkey.startsWith('dkind.')) {
        // vom.dkind.23.descriptor or .nextID
        const [kindID, ksubkey] = /^dkind\.(\d+)\.(.*)$/.exec(vsubkey).slice(1);
        const kind = provideKind(vat, kindID);
        kind[ksubkey] = value;
      } else if (vsubkey.startsWith('es.')) {
        // vom.es.o+d11/123
        incstat(stats.vom.exportStatus);
        const [vref] = /^es\.(.*)$/.exec(vsubkey).slice(1);
        const kindID = /^o\+d(\d+)\//.exec(vref).slice(1);
        const kind = provideKind(vat, kindID);
        // the value has one 'r' or 's' or '_' per facet (for reachable/recognizable/none)
        // for now, collapse all of that into a single "exported" count
        kind.exported += 1;
        gleanCollections(vatID, vref, vat);
      } else if (vsubkey.startsWith('rc.')) {
        // vom.rc.o+d11/123
        // vom.rc.o-56

        incstat(stats.vom.rc.total);
        if (vsubkey.startsWith('rc.o+')) {
          incstat(stats.vom.rc.exports.total);
          if (vsubkey.startsWith('rc.o+d')) {
            incstat(stats.vom.rc.exports.durable);
          } else if (vsubkey.startsWith('rc.o+v')) {
            incstat(stats.vom.rc.exports.virtual);
          } else {
            incstat(stats.vom.rc.exports.ephemeral);
          }
        } else {
          incstat(stats.vom.rc.imports);
        }

        if (vsubkey.startsWith('rc.o+d')) {
          // only vom.rc.o+d11/123, ignore vom.rc.o-56
          const [vref] = /^rc\.(.*)$/.exec(vsubkey).slice(1);
          const kindID = /^o\+d(\d+)\//.exec(vref).slice(1);
          const kind = provideKind(vat, kindID);
          kind.referenced += 1;
          gleanCollections(vatID, vref, vat);
        }
      } else if (vsubkey.startsWith('ir.')) {
        // vom.ir.o+d10/1
        // vom.ir.o-54
        incstat(stats.vom.ir);
        if (vsubkey.startsWith('ir.o+d')) {
          const [vref] = /^ir\.(.*)$/.exec(vsubkey).slice(1);
          const kindID = /^o\+d(\d+)\//.exec(vref).slice(1);
          const kind = provideKind(vat, kindID);
          kind.recognized += 1;
          gleanCollections(vatID, vref, vat);
        }
      } else {
        // vom.$(vref)
        incstat(stats.vom.data);
        const [vref] = /^(.*)$/.exec(vsubkey).slice(1);
        const kindID = /^o\+d(\d+)\//.exec(vref).slice(1);
        const kind = provideKind(vat, kindID);
        kind.defined += 1;
        if (!kind.sample) {
          kind.sample = [key, value];
        }
      }
    }
  }
  for (const [vatID, vat] of Object.entries(vats)) {
    vat.numCollections = vat.collections.length;
  }
  fs.writeFileSync(datafile, JSON.stringify(vats));
}

function manyCollections(datafile) {
  const vats = JSON.parse(fs.readFileSync(datafile));
  const counts = []; // [vatID, numCollections]
  for (const vatID of Object.keys(vats)) {
    const vat = vats[vatID];
    if (!vat.collections) {
      continue;
    }
    counts.push([vatID, Object.keys(vat.collections).length]);
  }
  counts.sort((a, b) => b[1] - a[1]); // descendng by numCollections
  for (const [vatID, numCollections] of counts) {
    console.log(vatID.padEnd(5, ' '), numCollections);
  }
}

// v43 has 1077 collections, v9 has 377, v11 has 312, v14 has 174, v16 has 64

function extractLabel(schemataCDs) {
  const { body } = JSON.parse(schemataCDs);
  if (!body.startsWith('#')) {
    return body; // close enough
  }
  const { label } = JSON.parse(body.slice(1));
  return label;
}

function largeCollections(datafile) {
  const vats = JSON.parse(fs.readFileSync(datafile));
  const counts = []; // [vatID, collectionID, length]
  for (const vatID of Object.keys(vats)) {
    const vat = vats[vatID];
    if (!vat.collections) {
      // continue;
    }
    for (const collectionID of Object.keys(vat.collections)) {
      const collection = vat.collections[collectionID];
      counts.push([vatID, collectionID, collection.entries]);
    }
  }
  counts.sort((a, b) => b[2] - a[2]); // descendng by collection.entries
  for (const [vatID, collectionID, entries] of counts) {
    const collection = vats[vatID].collections[collectionID];
    const label = extractLabel(collection.schemata);
    let sample = '';
    if (collection.sample) {
      let [key, value] = collection.sample;
      key = key.slice(`${vatID}.vs.vc.${collectionID}.`.length);
      sample = `${key.padStart(46, ' ')} -> ${value}`;
    }
    console.log(
      vatID.padStart(3, ' '),
      `c${collectionID}`.padStart(5, ' '),
      `${entries}`.padStart(7, ' '),
      label.padEnd(30, ' '),
      '  ',
      sample,
    );
  }
}

// top 6 collections:
// v29   c13  120544 paymentLedger
// v29   c14  120544 paymentRecoverySets
// v29   c16  120544 recovery set
// v46   c14   90408 paymentLedger
// v46   c15   90408 paymentRecoverySets
// v46   c17   90408 recovery set

function extractVOMTag(descriptorJSON) {
  const descriptor = JSON.parse(descriptorJSON);
  const { tag } = descriptor;
  return tag;
}

function manyVOMs(datafile) {
  const vats = JSON.parse(fs.readFileSync(datafile));
  // 'recognized' here means there's a vom.ir. key, which involves Weak collections
  const counts = []; // [vatID, kindID, defined, exported, referenced, recognized]
  for (const vatID of Object.keys(vats)) {
    const vat = vats[vatID];
    for (const kindID of Object.keys(vat.kinds)) {
      const kind = vat.kinds[kindID];
      // console.log(vatID, kindID, kind);
      counts.push([
        vatID,
        kindID,
        kind.defined,
        kind.exported,
        kind.referenced,
        kind.recognized,
      ]);
    }
  }
  counts.sort((a, b) => b[2] - a[2]); // descending by numDefined
  console.log(
    'vatID'.padEnd(5, ' '),
    'kindID'.padStart(7, ' '),
    'tag'.padEnd(20, ' '),
    `defined`.padStart(7, ' '),
    `referenced`.padStart(10, ' '),
    `recognized`.padStart(10, ' '),
    `exported`.padStart(8, ' '),
    `sample`,
  );
  for (const [
    vatID,
    kindID,
    defined,
    exported,
    referenced,
    recognized,
  ] of counts) {
    const kind = vats[vatID].kinds[kindID];
    const tag = extractVOMTag(kind.descriptor || '{"tag":""}');
    let sample = '';
    if (kind.sample) {
      const [key, value] = kind.sample;
      sample = `${value}`;
      if (sample.length > 60) {
        sample = `${sample.slice(0, 60)} ..`;
      }
    }
    console.log(
      vatID.padEnd(5, ' '),
      kindID.padStart(7, ' '),
      `${tag}`.padEnd(20, ' '),
      `${defined}`.padStart(7, ' '),
      `${referenced}`.padStart(10, ' '),
      `${recognized}`.padStart(10, ' '),
      `${exported}`.padStart(8, ' '),
      sample,
    );
  }
}

// top 15:
// vatID  kindID tag                  defined referenced recognized exported sample
// v29        22 quote payment         120556     120544     241088       33 {}
// v46        22 quote payment          90441      90408     180816    30167 {}
// v9         30 zoe Seat publisher     55867      55867          0        0 {"valueDurability":
// v9         31 ZoeSeatKit             55867      55867          0       22 {"currentAllocation":
// v9         32 SeatHandle             54068          0      54068    54068 {}
// v29        11 ExitObject             50570          0          0    50570 {"zcfSeat":
// v29        18 zcfSeat                50570      50570      50570        0 {"proposal":
// v48        11 ExitObject              3684          0          0     3684 {"zcfSeat":
// v48        18 zcfSeat                 3684       3684       5422        0 {"proposal":
// v9         11 IST payment             3446       3427       3436       30 {}
// v48        10 SeatHandle              1776       1776          0     1776 {}
// v17        22 USDC_axl payment         510          1          2      475 {}
// v37        11 ExitObject               477          0          0      477 {"zcfSeat":
// v37        18 zcfSeat                  477        477        480        0 {"proposal":

function describeKind(datafile, vatID, kindID) {
  const vats = JSON.parse(fs.readFileSync(datafile));
  const kind = vats[vatID].kinds[kindID];
  console.log(`vat: ${vatID}`);
  console.log(`kind: ${kindID}`);
  console.log(kind);
}

function describeCollection(datafile, vatID, collectionID) {
  const vats = JSON.parse(fs.readFileSync(datafile));
  const vat = vats[vatID];
  const collection = vat.collections[collectionID];
  console.log(`vat: ${vatID}`);
  console.log(`collection: ${collectionID}`);
  if (collection.kindID) {
    const storeType = vat.kindIDToStoreType[collection.kindID];
    console.log(`storeType: ${storeType} (kindID ${collection.kindID})`);
  }
  console.log(collection);
}

const [eqdf, datafile, subcommand, ...subargs] = process.argv.slice(2);
if (!(eqdf === '--datafile')) {
  throw Error(
    'usage: categorize-kvstore.js --datafile df.json SUBCOMMAND SUBARGS..',
  );
}

if (subcommand === 'ingest') {
  ingestSwingSstore(datafile, ...subargs);
} else if (subcommand === 'many-collections') {
  manyCollections(datafile, ...subargs);
} else if (subcommand === 'large-collections') {
  largeCollections(datafile, ...subargs);
} else if (subcommand === 'many-voms') {
  manyVOMs(datafile, ...subargs);
} else if (subcommand === 'describe-kind') {
  describeKind(datafile, ...subargs);
} else if (subcommand === 'describe-collection') {
  describeCollection(datafile, ...subargs);
} else {
  console.log(`unknown subcommand ${subcommand}`);
}

// v29.c12: zcfSeatToSeatHandle
// 'sagoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346'
