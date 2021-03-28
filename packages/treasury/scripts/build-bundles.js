/* global __dirname require */

// eslint-disable-next-line import/no-extraneous-dependencies
import 'ses';
import fs from 'fs';
import process from 'process';
import bundleSource from '@agoric/bundle-source';

const srcDir = `${__dirname}/../src`;
const bundlesDir = `${__dirname}/../bundles`;

async function writeSourceBundle(contractFilename, outputPath) {
  const path = require.resolve(contractFilename);
  await bundleSource(path).then(bundle => {
    // TODO: fix
    // @ts-ignore mkdirSync believes it only accepts 2 arguments.
    fs.mkdirSync(bundlesDir, { recursive: true }, err => {
      if (err) throw err;
    });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

async function main() {
  const contractOutputs = [
    [
      `${srcDir}/stablecoinMachine.js`,
      `${bundlesDir}/bundle-stablecoinMachine.js`,
    ],
    [
      `${srcDir}/liquidateMinimum.js`,
      `${bundlesDir}/bundle-liquidateMinimum.js`,
    ],
    [
      `@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap`,
      `${__dirname}/../bundles/bundle-multipoolAutoswap.js`,
    ],
  ];
  for (const [contractFilename, outputPath] of contractOutputs) {
    // eslint-disable-next-line no-await-in-loop
    await writeSourceBundle(contractFilename, outputPath);
  }
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating contract bundles:');
    console.log(err);
    process.exit(1);
  },
);
