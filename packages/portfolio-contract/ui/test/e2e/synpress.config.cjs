const config = require('@agoric/synpress/synpress.config');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  ...config,
  e2e: {
    ...config.e2e,
    baseUrl: 'http://localhost:5173',
    specPattern: 'test/e2e/specs/**/*spec.{js,jsx,ts,tsx}',
    supportFile: 'test/support.js',
    screenshotsFolder: 'test/e2e/screenshots',
    videosFolder: 'test/e2e/videos'
  },
});
