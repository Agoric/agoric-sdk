// @ts-check
import processAmbient from 'process';
import dbOpenAmbient from 'better-sqlite3';
import { makeSwingstore, swingstorePath } from './swingStore-lite.mjs';

/**
 * @file look up vat incarnation from kernel DB
 * @see {main}
 */

/** @type {<T>(val: T | undefined) => T} */
const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};

/**
 * @param {string[]} argv
 * @param {{ dbOpen: typeof import('better-sqlite3'), HOME?: string }} io
 */
const main = async (argv, { dbOpen, HOME }) => {
  const [_node, _script, vatName] = argv;
  if (!vatName) throw Error('vatName required');

  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  const kStore = makeSwingstore(dbOpen(fullPath, { readonly: true }));

  const vatID = kStore.findVat(vatName);
  const vatInfo = kStore.lookupVat(vatID);

  const source = vatInfo.source();
  const { incarnation } = vatInfo.currentSpan();

  // misc info to stderr
  console.error(JSON.stringify({ vatName, vatID, incarnation, ...source }));

  // incarnation to stdout
  console.log(incarnation);
};

processAmbient.exitCode = 1;
main(processAmbient.argv, {
  dbOpen: dbOpenAmbient,
  HOME: processAmbient.env.HOME,
}).then(
  () => {
    processAmbient.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    processAmbient.exit(processAmbient.exitCode || 1);
  },
);
