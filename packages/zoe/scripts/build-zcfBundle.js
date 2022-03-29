import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import fs from 'fs';
import path from 'path';
import process from 'process';
import bundleSource from '@endo/bundle-source';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

async function writeSourceBundle(contractFilename, outputPath) {
  await bundleSource(contractFilename).then(bundle => {
    fs.mkdirSync(`${dirname}/../bundles`, { recursive: true });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

const main = () =>
  Promise.all(
    [
      { src: 'contractFacet/vatRoot.js', bundle: 'bundle-contractFacet.js' },
    ].map(({ src, bundle }) => {
      const contractFilename = `${dirname}/../src/${src}`;
      const outputPath = `${dirname}/../bundles/${bundle}`;
      return writeSourceBundle(contractFilename, outputPath);
    }),
  );

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating zcf bundle:');
    console.log(err);
    process.exit(1);
  },
);
