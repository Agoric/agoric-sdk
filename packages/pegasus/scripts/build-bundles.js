import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import fs from 'fs';
import path from 'path';
import process from 'process';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const srcDir = `${dirname}/../src`;
const bundlesDir = `${dirname}/../bundles`;

async function writeSourceBundle(contractFilename, outputPath) {
  const bundlePath = new URL(
    await importMetaResolve(contractFilename, import.meta.url),
  ).pathname;
  await bundleSource(bundlePath).then(bundle => {
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
    [`${srcDir}/pegasus.js`, `${bundlesDir}/bundle-pegasus.js`],
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
