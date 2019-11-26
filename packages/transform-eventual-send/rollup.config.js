import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/transform-eventual-send.umd.js',
        format: 'umd',
        name: 'makeEventalSendTransformer',
      },
      {
        file: 'dist/transform-eventual-send.esm.js',
        format: 'esm',
      },
      {
        file: 'dist/transform-eventual-send.cjs.js',
        format: 'cjs',
      },
    ],
    plugins: [resolve()],
  },
];
