const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/check/endpoint',
    createProxyMiddleware({
      target: "https://dodobox.pppp.page:4570",
      changeOrigin: true,
    })
  );
};