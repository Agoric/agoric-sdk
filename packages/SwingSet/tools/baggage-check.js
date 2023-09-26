import { makeMarshal } from '@endo/marshal';
import { Far } from '@endo/far';

/* eslint-disable no-use-before-define */

function fakeSTV(slot, iface = 'Remotable') {
  return Far(iface, {
    getSlot: () => slot,
  });
}

const marshaller = makeMarshal(undefined, fakeSTV, {
  serializeBodyFormat: 'smallcaps',
});
const { fromCapData } = marshaller;

function decodeValueString(s) {
  const parsed = JSON.parse(s);
  const value = fromCapData(parsed);
  return [value, parsed.slots];
}

function extractDurableRefParts(ref) {
  const patt = /^o\+d([0-9]+)\/([0-9]+)$/;
  const matches = ref.match(patt);
  if (matches) {
    return [+matches[1], +matches[2]];
  } else {
    return null;
  }
}

export function checkBaggage(db, vatID, verbose = false) {
  const sqlKVDump = db.prepare(`
    SELECT key, value
    FROM kvStore
    WHERE key GLOB ?
  `);

  const sqlKVGet = db.prepare(`
    SELECT value
    FROM kvStore
    WHERE key = ?
  `);
  sqlKVGet.pluck(true);

  const vatStoreKeyRoot = `${vatID}.vs`;
  const vomKeyRoot = `${vatStoreKeyRoot}.vom`;
  const dkindKeyRoot = `${vomKeyRoot}.dkind`;
  const vcKeyRoot = `${vatStoreKeyRoot}.vc`;

  // Kinds which are known to have definitions.  Initially these are just those
  // whose definitions are built in.
  const predefinedKinds = new Map(); // kindID -> tag

  predefinedKinds.set(1, 'kindHandle');
  const builtInKinds = JSON.parse(
    sqlKVGet.get(`${vatStoreKeyRoot}.storeKindIDTable`),
  );
  for (const kindName of Object.keys(builtInKinds)) {
    predefinedKinds.set(builtInKinds[kindName], kindName);
  }
  const KIND_HANDLE_BASEREF = 1;
  const BIGMAP_BASEREF = 6;
  const BIGSET_BASEREF = 8;

  // Kinds for which we have seen a kindHandle entry in the vatStore.  These are
  // kinds which exist and have been used at some point, though their current
  // ontological status is unknown.
  const extantKinds = new Map(); // kindID -> tag

  // Kinds for which we have seen a kindHandle value reference in the reference
  // graph descended from baggage.  These are kinds that are potentially
  // definable, though we can't at this stage determine if they've actually been
  // given definitions.
  const knownKinds = new Set();

  // Kinds that have been seen in use somewhere.  These are kinds that had
  // better have definitions or else something Bad will happen.
  const usedKinds = new Set();

  const kindKVs = sqlKVDump.iterate(`${dkindKeyRoot}.*`);
  for (const kv of kindKVs) {
    const descriptorSuffix = '.descriptor';
    if (kv.key.endsWith(descriptorSuffix)) {
      const dkindID = kv.key
        .substring(0, kv.key.length - descriptorSuffix.length)
        .substring(dkindKeyRoot.length + 1);
      const descriptor = JSON.parse(kv.value);
      extantKinds.set(+dkindID, descriptor.tag);
    }
  }

  let pendingCollections = new Set();
  const knownCollections = new Set();
  let pendingObjects = new Set();
  const knownObjects = new Set();

  pendingCollections.add(1);
  do {
    const workingCollections = pendingCollections;
    pendingCollections = new Set();
    for (const coll of workingCollections) {
      knownCollections.add(coll);
    }
    for (const coll of workingCollections) {
      scanCollection(coll);
    }
    const workingObjects = pendingObjects;
    pendingObjects = new Set();
    for (const obj of workingObjects) {
      knownObjects.add(obj);
    }
    for (const obj of workingObjects) {
      scanObject(obj);
    }
  } while (pendingCollections.size > 0 || pendingObjects.size > 0);

  // Kinds which have been used but whose kindID handles have not been seen
  const usedButNotKnownKinds = new Set();
  for (const v of usedKinds) {
    usedButNotKnownKinds.add(v);
  }
  for (const v of knownKinds) {
    usedButNotKnownKinds.delete(v);
  }

  // Kinds which exist but whose kind handles have not been seen
  const extantButNotSeen = new Map();
  for (const [k, v] of extantKinds) {
    extantButNotSeen.set(v, k);
  }
  for (const k of knownKinds) {
    extantButNotSeen.delete(k);
  }
  // Kinds which exist but are not used
  const extantButNotUsed = new Map();
  for (const [k, v] of extantKinds) {
    extantButNotUsed.set(v, k);
  }
  for (const k of usedKinds) {
    extantButNotUsed.delete(k);
  }

  if (verbose || usedButNotKnownKinds.size > 0) {
    console.log('predefinedKinds', predefinedKinds);
    console.log('extantKinds', extantKinds);
    console.log('knownKinds', knownKinds);
    console.log('usedKinds', usedKinds);
    console.log('extantButNotSeen', extantButNotSeen);
    console.log('extantButNotUsed', extantButNotUsed);
    console.log('usedButNotKnownKinds', usedButNotKnownKinds);
  }
  if (usedButNotKnownKinds.size > 0) {
    throw Error(
      `kind IDs used without reachable kind ID handles: ${usedButNotKnownKinds.size}`,
    );
  }

  function scanSlots(slots) {
    for (const slot of slots) {
      const refParts = extractDurableRefParts(slot);
      if (refParts) {
        const [baseRef, subRef] = refParts;
        if (baseRef === BIGMAP_BASEREF || baseRef === BIGSET_BASEREF) {
          if (!knownCollections.has(subRef)) {
            pendingCollections.add(subRef);
          }
        } else if (baseRef === KIND_HANDLE_BASEREF) {
          knownKinds.add(subRef);
        } else {
          if (!usedKinds.has(baseRef)) {
            usedKinds.add(baseRef);
          }
          if (!knownObjects.has(slot)) {
            pendingObjects.add(slot);
          }
        }
      }
    }
  }

  function scanCollection(collectionID) {
    const collectionKeyRoot = `${vcKeyRoot}.${collectionID}.`;
    const keyMatch = `${collectionKeyRoot}[a-z]*`;
    const kvPairs = sqlKVDump.iterate(keyMatch);
    for (const kv of kvPairs) {
      const key = kv.key.substring(collectionKeyRoot.length);
      const [_, slots] = decodeValueString(kv.value);
      if (key[0] === 'r') {
        const rkey = key.split(':')[1];
        scanSlots([rkey]);
      }
      scanSlots(slots);
    }
  }

  function scanObject(objectID) {
    const rawObj = sqlKVGet.get(`${vomKeyRoot}.${objectID}`);
    const props = JSON.parse(rawObj);
    for (const prop of Object.keys(props)) {
      scanSlots(props[prop].slots);
    }
  }
}
