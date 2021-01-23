import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'lib/bootstrap.js',
    output: {
      file: `dist/bootstrap.umd.js`,
      format: 'umd',
      name: 'Bootstrap',
    },
    plugins: [resolve(), commonjs()],
  },
];
