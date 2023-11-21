// @ts-check

export const redactImportDecls = txt =>
  txt.replace(/^\s*import\b\s*(.*)/gm, '// REDACTED: $1');

export const omitExportKewords = txt => txt.replace(/^\s*export\b\s*/gm, '');

// cf. ses rejectImportExpressions
// https://github.com/endojs/endo/blob/ebc8f66e9498f13085a8e64e17fc2f5f7b528faa/packages/ses/src/transforms.js#L143
export const hideImportExpr = txt => txt.replace(/\bimport\b/g, 'XMPORT');
