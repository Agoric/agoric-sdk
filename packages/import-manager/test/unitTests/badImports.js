// Copyright (C) 2019 Agoric, under Apache License 2.0

import { importManager } from '../../src/importManager.js';
import { listIsEmpty, numIsEmpty } from './valueOps.js';

function makeBadImportManager() {
  const mgr = importManager();
  const obj = { numIsEmpty };
  const fooSym = Symbol('foo');
  obj[fooSym] = listIsEmpty;
  return mgr.addExports(obj);
}

export { makeBadImportManager };
