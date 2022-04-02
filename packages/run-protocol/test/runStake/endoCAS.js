import { E, Far } from '@endo/far';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { ZipWriter } from '@endo/zip';

/** @param {ZCF} zcf */
export const start = zcf => {
  const zoe = zcf.getZoeService();

  const makeBundler = () => {
    let writer = new ZipWriter();

    return Far('Bundler', {
      add: (name, encodedContent) => {
        const buf = decodeBase64(encodedContent);
        // XS decodes a pure ArrayBuffer, but we need a Uint8Array.
        const content = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        writer.write(name, content);
      },
      install: bundleShell => {
        const snapshot = writer.snapshot();
        const endoZipBase64 = encodeBase64(snapshot);
        const bundle = harden({ ...bundleShell, endoZipBase64 });
        return E(zoe).install(bundle);
      },
      clear: () => {
        writer = new ZipWriter();
      },
    });
  };
  const publicFacet = Far('endoCAS', {
    makeBundler,
  });

  return harden({ publicFacet });
};
harden(start);
