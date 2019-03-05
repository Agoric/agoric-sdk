import fs from 'fs';
import { rollup } from 'rollup';

async function main() {
  const bundle = await rollup({
    input: require.resolve('../src/kernel/index.js'),
    treeshake: false,
    external: ['@agoric/nat', '@agoric/harden'],
  });
  const { output } = await bundle.generate({
    format: 'iife',
    //exports: 'buildKernel',
    name: 'buildKernel',
    globals: {
      '@agoric/harden': 'harden',
    },
  });
  if (output.length !== 1) {
    throw Error('unprepared for more than one chunk/asset');
  }
  if (output[0].isAsset) {
    throw Error(`unprepared for assets: ${output[0].fileName}`);
  }
  let { code: source } = output[0];
  const { map: sourceMap } = output[0];

  // 'source' is now a string that looks like:
  // var buildKernel = (function(harden){..}(harden));
  if (!source.startsWith('var buildKernel = (function')) {
    throw Error('unexpected prefix');
  }

  // This is close, but we need a stringifiable function, exported as an ES6
  // module. So we wrap it in an outer function.

  source = `
export default function kernelSourceFunc() {
const harden = require('@agoric/harden');

${source}

return buildKernel;
}
`;

  const f = await fs.promises.open('src/bundles/kernel', 'w', 0o644);
  await f.write(source);
  await f.close();
}


main();
