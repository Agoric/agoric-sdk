const fs = require('node:fs');
const path = require('path');

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

// Import rules
const startFunctionPrelude = require('./rules/start-function-prelude.js');
const groupJsdocImports = require('./rules/group-jsdoc-imports.js');

module.exports = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },

  // Rule definitions
  rules: {
    'start-function-prelude': startFunctionPrelude,
    'group-jsdoc-imports': groupJsdocImports,
  },

  // Recommended config
  configs: {
    recommended: {
      plugins: ['@agoric'],
      rules: {
        '@agoric/start-function-prelude': 'error',
        '@agoric/group-jsdoc-imports': 'warn',
      },
    },
  },
};
