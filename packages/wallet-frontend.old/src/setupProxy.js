// Manual Proxy

// Note: You do not need to import this file anywhere. It is automatically registered
// when you start the development server.

const { createProxyMiddleware } = require('http-proxy-middleware');

const API_URL = process.env.REACT_APP_API_URL;

// eslint-disable-next-line func-names
module.exports = function(app) {
  if (API_URL > '') {
    app.use('/private/wallet', createProxyMiddleware({ target: API_URL }));
  }
  // TODO proxy websocket.
  // app.use(
  //   '/socket',
  //   proxy({
  //     ws: true,
  //   }),
  // );
};
