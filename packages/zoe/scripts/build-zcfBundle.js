import 'ses';
import fs from 'fs';
import process from 'process';
import bundleSource from '@agoric/bundle-source';

async function writeSourceBundle(contractFilename, outputPath) {
  await bundleSource(contractFilename).then(bundle => {
    fs.mkdirSync(`${__dirname}/../bundles`, { recursive: true }, err => {
      if (err) throw err;
    });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

async function main() {
  const contractFilename = `${__dirname}/../src/contractFacet/contractFacet.js`;
  const outputPath = `${__dirname}/../bundles/bundle-contractFacet.js`;
  await writeSourceBundle(contractFilename, outputPath);
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating zcf bundle:');
    console.log(err);
    process.exit(1);
  },
);
