import { makeReadOnlyFile } from '@agoric/pola-io';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

const file = {
  async getBytes() {
    return fsp.readFile('/etc/hosts', 'utf8');
  },
  async setBytes(_bytes) {
    throw new Error('setBytes not permitted');
  },
};

const readonly = makeReadOnlyFile(file);
await readonly.getBytes(); // Allowed
await readonly.setBytes(); // Throws or is not defined
