// Manual Proxy

// Note: You do not need to import this file anywhere. It is automatically registered
// when you start the development server.

const proxy = require('http-proxy-middleware');

const target = process.env.REACT_APP_API_URL;

// eslint-disable-next-line func-names
module.exports = function(app) {
  if (target > '') {
    app.use('/vat', proxy({ target }));
  }
  // TODO proxy websocket.
  // app.use(
  //   '/socket',
  //   proxy({
  //     ws: true,
  //   }),
  // );
};
