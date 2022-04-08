import { E, Far } from '@endo/far';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { ZipWriter } from '@endo/zip';

export const start = () => {
  const makeBundler = ({ zoe }) => {
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
        const bundle = { ...bundleShell, endoZipBase64 };
        return E(zoe)
          .install(bundle)
          .finally(() => nameToContent.clear());
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
