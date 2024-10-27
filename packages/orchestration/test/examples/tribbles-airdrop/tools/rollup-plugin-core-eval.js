// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import '@endo/init';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';

export const coreEvalGlobals = {
  E: 'E',
  Far: 'Far',
};

const redactImportDecls = txt =>
  txt.replace(/^\s*import\b\s*(.*)/gm, '// XMPORT: $1');
const omitExportKewords = txt => txt.replace(/^\s*export\b\s*/gm, '');
// cf. ses rejectImportExpressions
// https://github.com/endojs/endo/blob/ebc8f66e9498f13085a8e64e17fc2f5f7b528faa/packages/ses/src/transforms.js#L143
const hideImportExpr = txt => txt.replace(/\bimport\b/g, 'XMPORT');

export const moduleToScript = () => ({
  name: 'module-to-script',
  generateBundle: (_opts, bundle, _isWrite) => {
    for (const fileName of Object.keys(bundle)) {
      bundle[fileName].code = hideImportExpr(
        redactImportDecls(omitExportKewords(bundle[fileName].code)),
      );
    }
  },
});

export const configureOptions = ({ options }) => {
  const pattern = new RegExp(`options: Fail.*`, 'g');
  const replacement = `options: ${JSON.stringify(options)},`;
  return {
    name: 'configureOptions',
    transform: async (code, _id) => {
      const revised = code.replace(pattern, replacement);
      if (revised === code) return null;
      return { code: revised };
    },
  };
};

export const configureBundleID = ({ name, rootModule, cache }) => {
  const pattern = new RegExp(`bundleID\\b = Fail.*`, 'g');
  const bundleCacheP = makeNodeBundleCache(cache, {}, s => import(s));
  return {
    name: 'configureBundleID',
    transform: async (code, _id) => {
      const bundle = await bundleCacheP.then(c => c.load(rootModule, name));
      const revised = code.replace(
        pattern,
        `bundleID = ${JSON.stringify(`b1-${bundle.endoZipBase64Sha512}`)},`,
      );
      if (revised === code) return null;
      return { code: revised };
    },
  };
};

export const emitPermit = ({ permit, file }) => ({
  name: 'emit-permit',
  generateBundle(_opts, _bundle) {
    this.emitFile({
      type: 'asset',
      fileName: file,
      source: JSON.stringify(permit, null, 2),
    });
  },
});
