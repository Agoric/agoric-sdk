import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

// Import rules

const plugin = {
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

export default plugin;
