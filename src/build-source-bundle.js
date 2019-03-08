import fs from 'fs';
import process from 'process';
import { rollup } from 'rollup';

export default async function bundleSource(startFilename) {
  const bundle = await rollup({
    input: require.resolve(startFilename),
    treeshake: false,
    external: ['@agoric/nat', '@agoric/harden'],
  });
  const { output } = await bundle.generate({
    format: 'cjs',
  });
  if (output.length !== 1) {
    throw Error('unprepared for more than one chunk/asset');
  }
  if (output[0].isAsset) {
    throw Error(`unprepared for assets: ${output[0].fileName}`);
  }
  let { code: source } = output[0];
  const { map: sourceMap } = output[0];

  // 'source' is now a string that contains a program, which references
  // require() and sets module.exports . This is close, but we need a single
  // stringifiable function, as an ES6 module's default export. So we wrap it
  // in an outer function.

  source = `
export default function getExport() {
const module = {};

${source}

return module.exports;
}
`;

  return source;
}
