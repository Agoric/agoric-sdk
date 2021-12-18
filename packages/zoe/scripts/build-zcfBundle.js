import '@agoric/install-ses/pre-bundle-source.js';
import '@agoric/install-ses';
import fs from 'fs';
import path from 'path';
import process from 'process';
import bundleSource from '@agoric/bundle-source';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

async function writeSourceBundle(contractFilename, outputPath) {
  await bundleSource(contractFilename).then(bundle => {
    fs.mkdirSync(`${dirname}/../bundles`, { recursive: true });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

async function main() {
  for await (const { src, bundle } of [
    { src: 'contractFacet/vatRoot.js', bundle: 'bundle-contractFacet.js' },
    {
      src: 'contracts/attestation/attestation.js',
      bundle: 'bundle-attestation.js',
    },
  ]) {
    const contractFilename = `${dirname}/../src/${src}`;
    const outputPath = `${dirname}/../bundles/${bundle}`;
    await writeSourceBundle(contractFilename, outputPath);
  }
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating zcf bundle:');
    console.log(err);
    process.exit(1);
  },
);
