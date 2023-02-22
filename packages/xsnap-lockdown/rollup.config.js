import { string } from 'rollup-plugin-string';

export default [
  {
    input: 'lib/object-inspect.js',
    output: {
      file: 'dist/src-object-inspect.js',
      format: 'esm',
    },
    plugins: [string({ include: 'lib/object-inspect.js' })],
  },
];
