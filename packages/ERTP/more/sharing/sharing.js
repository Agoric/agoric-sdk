// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeSharedMap } from './sharedMap';
import { insist } from '../../util/insist';

function makeSharingService() {
  // I'd have used PrivateNames, but they want objects (not Strings) as Keys.
  const sharedMaps = new Map();
  const brand = new WeakSet();
  const tombstone = [];

  const sharingService = harden({
    // retrieve and remove from the map.
    grabSharedMap(key) {
      if (!sharedMaps.has(key)) {
        return undefined;
      }
      if (sharedMaps.get(key) === tombstone) {
        throw new Error(`Entry for ${key} has already been collected.`);
      }
      const result = sharedMaps.get(key);
      // these are single-use entries. Leave a tombstone to prevent MITM.
      sharedMaps.set(key, tombstone);
      return result;
    },
    createSharedMap(preferredName) {
      if (sharedMaps.has(preferredName)) {
        throw new Error(`Entry already exists: ${preferredName}`);
      }
      const sharedMap = makeSharedMap(preferredName);
      sharedMaps.set(preferredName, sharedMap);
      brand.add(sharedMap);
      return sharedMap;
    },
    validate(allegedSharedMap) {
      insist(brand.has(allegedSharedMap))`\
Unrecognized sharedMap: ${allegedSharedMap}`;
      return allegedSharedMap;
    },
    // We don't need remove, since grabSharedMap can be used for that.
  });

  return sharingService;
}

export { makeSharingService };
