import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/transform-metering.umd.js',
        format: 'umd',
        name: 'TransformMetering',
      },
      {
        file: 'dist/transform-metering.cjs.js',
        format: 'cjs',
      },
    ],
    plugins: [resolve()],
  },
];
