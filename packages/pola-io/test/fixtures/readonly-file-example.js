import * as fsp from 'node:fs/promises';

import { makeFileRW } from '@agoric/pola-io';

const file = makeFileRW('/', { fsp });
const readonly = file.readOnly();
await readonly.readText(); // Allowed
// @ts-expect-error static error
await readonly.writeText();
