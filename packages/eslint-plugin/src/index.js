import fs from 'node:fs';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

// Import rules
import startFunctionPrelude from './rules/start-function-prelude.js';
import groupJsdocImports from './rules/group-jsdoc-imports.js';

const plugin = {
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

export default plugin;
