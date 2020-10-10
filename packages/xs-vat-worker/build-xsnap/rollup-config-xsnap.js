import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjsPlugin from '@rollup/plugin-commonjs';

export default {
  input: 'input/functions.js',
  plugins: [resolvePlugin({ preferBuiltins: true }), commonjsPlugin()],
  output: {
    file: 'bundle-functions-xsnap.js',
    exports: 'named',
    format: 'es',
    sourcemap: false,
    intro: 'const harden = Object.freeze;',
  },
};
