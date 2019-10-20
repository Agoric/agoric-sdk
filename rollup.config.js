export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/bundle-source.umd.js',
        format: 'umd',
        name: 'BundleSource',
      },
      {
        file: 'dist/bundle-source.esm.js',
        format: 'esm',
      },
      {
        file: 'dist/bundle-source.cjs.js',
        format: 'cjs',
      },
    ],
  },
];
