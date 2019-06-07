// given a filename, return an object which provides the "external" storage
// API needed buildVatController().

import fs from 'fs';
import harden from '@agoric/harden';
import makeStorageInMemory from './stateInMemory';

export default function buildExternalForFile(fn) {
  let storage;
  try {
    const data = fs.readFileSync(fn);
    storage = JSON.parse(data);
  } catch (e) {
    storage = {};
  }
  const externalStorage = makeStorageInMemory(storage);
  function save() {
    fs.writeFileSync(fn, JSON.stringify(storage));
  }

  return harden({ externalStorage, save });
}
