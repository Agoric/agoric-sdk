const fs = require('node:fs');
const path = require('path');

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

// Import rules

module.exports = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },

  // Rule definitions
  rules: {

  },

  // Recommended config
  configs: {
    recommended: [
      {
        plugins: {
          // @ts-expect-error used before declaration
          '@agoric': plugin,
        },
        rules: {
          
        },
      },
    ],
  },
};
