/* global __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import 'ses';
import fs from 'fs';
import process from 'process';
import bundleSource from '@agoric/bundle-source';

async function writeSourceBundle(contractFilename, outputPath) {
  await bundleSource(contractFilename).then(bundle => {
    fs.mkdirSync(`${__dirname}/../bundles`, { recursive: true });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

async function main() {
  const contractFilename = `${__dirname}/../src/vat-spawned.js`;
  const outputPath = `${__dirname}/../bundles/bundle-spawn.js`;
  await writeSourceBundle(contractFilename, outputPath);
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating spawn bundle:');
    console.log(err);
    process.exit(1);
  },
);
