import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/default-evaluate-options.umd.js',
        format: 'umd',
        name: 'makeDefaultEvaluateOptions',
      },
      {
        file: 'dist/default-evaluate-options.esm.js',
        format: 'esm',
      },
      {
        file: 'dist/default-evaluate-options.cjs.js',
        format: 'cjs',
      },
    ],
    plugins: [resolve(), commonjs({ include: /node_modules/ })],
  },
];
