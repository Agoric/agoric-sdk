import { rollup } from 'rollup';
import resolve from 'rollup-plugin-node-resolve';
import infixBang from '@agoric/acorn-infix-bang';

export default async function bundleSource(startFilename) {
  const bundle = await rollup({
    input: require.resolve(startFilename),
    treeshake: false,
    external: ['@agoric/evaluate', '@agoric/nat', '@agoric/harden'],
    plugins: [resolve()],
    acornInjectPlugins: [infixBang()],
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
  // const { map: sourceMap } = output[0];

  // 'source' is now a string that contains a program, which references
  // require() and sets module.exports . This is close, but we need a single
  // stringifiable function, so we must wrap it in an outer function that
  // returns the exports.
  //
  // build-kernel.js will prefix this with 'export default' so it becomes an
  // ES6 module. The Vat controller will wrap it with parenthesis so it can
  // be evaluated and invoked to get at the exports.

  source = `
function getExport() {
let exports = {};
const module = { exports };

${source}

return module.exports;
}
`;

  return source;
}
