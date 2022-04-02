import { E, Far } from '@endo/far';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { ZipWriter } from '@endo/zip';

/** @param {ZCF} zcf */
export const start = zcf => {
  const zoe = zcf.getZoeService();

  const makeBundler = () => {
    const nameToContent = new Map();

    return Far('Bundler', {
      add: (name, encodedContent) => {
        nameToContent.set(name, decodeBase64(encodedContent));
      },
      install: bundleShell => {
        const writer = new ZipWriter();
        for (const [name, content] of nameToContent.entries()) {
          writer.write(name, content);
        }
        const endoZipBase64 = encodeBase64(writer.snapshot());
        const bundle = harden({ ...bundleShell, endoZipBase64 });
        return E(zoe).install(bundle);
      },
      clear: () => {
        nameToContent.clear();
      },
    });
  };
  const publicFacet = Far('endoCAS', {
    makeBundler,
  });

  return harden({ publicFacet });
};
harden(start);
