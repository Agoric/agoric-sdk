// AVA configuration for this proposal. It lives in a config file rather
// than a package.json "ava" key so that, when linting from the repo root,
// AVA's config loader does not see both this package's config and the
// monorepo-root ava.config.js and reject them as conflicting. This project
// runs standalone inside the synthetic-chain container, so it deliberately
// does not extend the monorepo base config.
export default {
  require: ['@endo/init/debug.js'],
  concurrency: 1,
  serial: true,
  timeout: '2m',
  files: ['test/**/*.test.*', '!submission'],
};
