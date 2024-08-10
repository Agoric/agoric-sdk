# Notes about this package.json

The `exports` field uses [subpath patterns](https://nodejs.org/docs/latest-v18.x/api/packages.html#subpath-patterns) but Endo's bundler doesn't yet support those: https://github.com/endojs/endo/issues/2265

Meanwhile, we explicitly export whatever paths are needed by modules that end up in Endo bundles.
