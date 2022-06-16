const { rewireWorkboxGenerate } = require('react-app-rewire-workbox');
const path = require('path');

module.exports = function override(config, env) {
  if (true || env === 'production') {
    console.log('Production build - Adding Workbox for PWAs');

    const generateConfig = {
      exclude: [/\.map$/, /(^|\/)(?:asset-)manifest.*\.js(?:on)?$/],
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: ({ sameOrigin }) => !sameOrigin,
          handler: 'NetworkOnly',
        },
      ],
    };

    config = rewireWorkboxGenerate(generateConfig)(config, env);
  }

  // Copy file from src/public to the root of our build/ folder.
  config.module.rules.push({
    include: path.resolve(__dirname, '../src/public'),
    type: 'asset/resource',
    generator: {
      filename: ({ filename }) => filename.replace(/^src\/public\//, ''),
    },
  });

  config.resolve.fallback = { path: false, crypto: false };
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};
