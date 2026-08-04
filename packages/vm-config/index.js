// Intentionally (almost) empty. This package is referenced only via string
// config specifiers (e.g. '@agoric/vm-config/decentral-core-config.json'), so
// nothing imports it as a module. It is pulled into the dependency graph by a
// marker `import '@agoric/vm-config'` in cosmic-swingset's launch-chain.js, and
// this file is that import's resolution target.
