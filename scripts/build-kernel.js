import fs from 'fs';
import process from 'process';
import bundleSource from '../src/build-source-bundle';

async function main() {
  const { source, sourceMap } = await bundleSource('../src/kernel/index.js');
  const actualSource = `export default ${source}\n${sourceMap}`;
  const f = await fs.promises.open('src/bundles/kernel', 'w', 0o644);
  await f.write(actualSource);
  await f.close();
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating src/bundles/kernel:');
    console.log(err);
    process.exit(1);
  },
);
