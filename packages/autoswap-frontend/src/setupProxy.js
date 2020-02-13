// Manual Proxy

// Note: You do not need to import this file anywhere. It is automatically registered
// when you start the development server.

const proxy = require('http-proxy-middleware');

const API_URL = process.env.REACT_APP_DAPP_API_URL;
const BRIDGE_URL = process.env.REACT_APP_WALLET_BRIDGE_URL;

module.exports = function(app) {
  if (API_URL > '') {
    app.use('/vat', proxy({ target: API_URL }));
  }
  if (BRIDGE_URL > '') {
    app.use(
      '/bridge',
      proxy({
        target: BRIDGE_URL,
        pathRewrite: {
          '^/bridge': '/vat',
        },
      }),
    );
  }
};
