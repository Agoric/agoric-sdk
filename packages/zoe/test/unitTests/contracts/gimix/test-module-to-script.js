// @ts-check
import test from 'ava';
import {
  hideImportExpr,
  omitExportKewords,
  redactImportDecls,
} from './module-to-script.js';

test('module to script: redact imports; omit export keywords', t => {
  const modText = `
import { E, Far } from '@endo/far';

/** @param {import('wonderland').Carol} carol */
export contst alice = (carol) => {
    E(bob).greet(carol);
};
      `;

  const expected = `
// REDACTED: { E, Far } from '@endo/far';

/** @param {XMPORT('wonderland').Carol} carol */
contst alice = (carol) => {
    E(bob).greet(carol);
};
      `;

  const script = hideImportExpr(redactImportDecls(omitExportKewords(modText)));
  t.is(script.trim(), expected.trim());
});
