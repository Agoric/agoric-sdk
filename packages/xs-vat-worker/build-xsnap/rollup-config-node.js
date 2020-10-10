import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjsPlugin from '@rollup/plugin-commonjs';

export default {
  input: 'input/functions.js',
  plugins: [resolvePlugin({ preferBuiltins: true }), commonjsPlugin()],
  output: {
    file: 'bundle-functions-node.js',
    exports: 'named',
    format: 'es',
    sourcemap: false,
  },
};
