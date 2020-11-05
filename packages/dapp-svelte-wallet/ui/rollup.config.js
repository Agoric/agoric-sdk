import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import smelte from 'smelte/rollup-plugin-smelte';

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;
  
  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/wallet/build/bundle.js'
  },
  plugins: [
    replace({
      isProduction: production,
    }),
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css: css => {
        css.write('public/wallet/build/bundle.css');
      }
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      mainFields: ['module', 'main', 'browser'],
      dedupe: ['svelte']
    }),
    commonjs(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),

    smelte({
      purge: production,
      output: 'public/wallet/build/smelte.css', // it defaults to static/global.css which is probably what you expect in Sapper
      postcss: [], // Your PostCSS plugins
      whitelist: [], // Array of classnames whitelisted from purging
      whitelistPatterns: [
        // FIXME: with purging, we lose a bunch of styles, so whitelist them all.
        /^/,
      ],
      tailwind: {
        theme: {
          extend: {
            spacing: {
              72: '18rem',
              84: '21rem',
              96: '24rem'
            }
          }
        }, // Extend Tailwind theme
        colors: {
          primary: '#ab2328',
          secondary: '#ffc600',
          error: '#f44336',
          success: '#4caf50',
          alert: '#ff9800',
          blue: '#2196f3',
          dark: '#212121'
        }, // Object of colors to generate a palette from, and then all the utility classes
        darkMode: true,
      }, // Any other props will be applied on top of default Smelte tailwind.config.js
    }),
  ],
  watch: {
    clearScreen: false
  }
};
