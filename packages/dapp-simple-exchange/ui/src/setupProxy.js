// Manual Proxy

// Note: You do not need to import this file anywhere. It is automatically registered
// when you start the development server.

const { createProxyMiddleware } = require('http-proxy-middleware');

const API_URL = process.env.REACT_APP_DAPP_API_URL;
const BRIDGE_URL = process.env.REACT_APP_WALLET_BRIDGE_URL;

module.exports = function manualProxy(app) {
  if (API_URL > '') {
    app.use('/vat', createProxyMiddleware({ target: API_URL }));
  }
  if (BRIDGE_URL > '') {
    app.use(
      '/bridge',
      createProxyMiddleware({
        target: BRIDGE_URL,
        pathRewrite: {
          '^/bridge': '/vat',
        },
      }),
    );
  }
};
