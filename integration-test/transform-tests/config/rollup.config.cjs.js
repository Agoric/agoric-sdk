/* eslint-disable-next-line import/no-unresolved */
import replace from 'rollup-plugin-replace';

export default [
  {
    input: '../test/test.js',
    output: {
      file: 'transform-tests/output/test.cjs.js',
      format: 'cjs',
    },
    external: ['@agoric/eventual-send', 'tape'],
    plugins: [
      replace({
        delimiters: ['', ''],
        "import makeEPromiseClass from '../src/index';":
          "import makeEPromiseClass from '@agoric/eventual-send';",
      }),
    ],
  },
];
