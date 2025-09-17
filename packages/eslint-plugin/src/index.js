const fs = require('node:fs');
const path = require('path');

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

// Import rules
const noTypedefImport = require('./rules/no-typedef-import.js');

module.exports = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },

  // Rule definitions
  rules: {
    'no-typedef-import': noTypedefImport,
  },

  // Recommended config
  configs: {
    recommended: {
      plugins: ['@agoric'],
      rules: {
        '@agoric/no-typedef-import': 'error',
      },
    },
  },
};
