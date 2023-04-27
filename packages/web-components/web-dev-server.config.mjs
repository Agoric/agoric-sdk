import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import process from 'process';

const commonjs = fromRollup(rollupCommonjs);
const polyfill = fromRollup(nodePolyfills);
// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: '/demo/',
  /** Use regular watch mode if HMR is not enabled. */
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  // appIndex: 'demo/index.html',

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
    false &&
      commonjs({
        include: [
          // the commonjs plugin is slow, list the required packages explicitly:
          '/__wds-outside-root__/**/node_modules/@cosmjs/**/*',
          '/__wds-outside-root__/**/node_modules/base64-js/**/*',
          '/__wds-outside-root__/**/node_modules/bech32/**/*',
          '/__wds-outside-root__/**/node_modules/libsodium-wrappers/**/*',
          // '/__wds-outside-root__/**/node_modules/libsodium/**/*',
          // '**/node_modules/<package-b>/**/*',
        ],
      }),
    false &&
      polyfill({
        include: ['/__wds-outside-root__/**/node_modules/libsodium/**/*'],
      }),
  ],

  // See documentation for all available options
});
