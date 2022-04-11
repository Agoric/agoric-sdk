import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { string } from 'rollup-plugin-string';

export default [
  {
    input: 'src/object-inspect.js',
    output: {
      file: 'dist/src-object-inspect.js',
      format: 'esm',
    },
    plugins: [string({ include: 'src/object-inspect.js' })],
  },
  {
    input: 'lib/ses-boot.js',
    output: {
      file: `dist/bundle-ses-boot.umd.js`,
      format: 'umd',
      name: 'Bootstrap',
    },
    plugins: [resolve(), commonjs()],
  },
  {
    input: 'lib/ses-boot-debug.js',
    output: {
      file: `dist/bundle-ses-boot-debug.umd.js`,
      format: 'umd',
      name: 'Bootstrap',
    },
    plugins: [resolve(), commonjs()],
  },
];
