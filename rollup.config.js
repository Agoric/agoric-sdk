import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/transform-bang.umd.js',
        format: 'umd',
        name: 'makeBangTransformer',
      },
      {
        file: 'dist/transform-bang.esm.js',
        format: 'esm',
      },
      {
        file: 'dist/transform-bang.cjs.js',
        format: 'cjs',
      },
    ],
    plugins: [resolve(), commonjs()],
  },
];
