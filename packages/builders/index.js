// Intentionally (almost) empty. This package is referenced only via string
// config specifiers (the proposal builders that bootstrap configs run), so
// nothing imports it as a module. It is pulled into the dependency graph by a
// marker `import '@agoric/builders'` in cosmic-swingset's launch-chain.js, and
// this file is that import's resolution target.
