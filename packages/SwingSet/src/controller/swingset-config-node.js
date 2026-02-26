/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeSwingsetConfigIO } from './swingset-config.js';

const { loadBasedir, normalizeConfig, loadSwingsetConfigFile } =
  makeSwingsetConfigIO({
    readdirSync: fs.readdirSync,
    statSync: fs.statSync,
    existsSync: fs.existsSync,
    readFileSync: (filePath, encoding) => fs.readFileSync(filePath, encoding),
    pathResolve: path.resolve,
    cwd: () => process.cwd(),
    importMetaResolve,
  });

export { loadBasedir, normalizeConfig, loadSwingsetConfigFile };
