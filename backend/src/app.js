const express = require("express");
const routes = require("./routes");
const corsMiddleware = require("./middlewares/cors.middleware");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const methodGuardMiddleware = require("./middlewares/methodGuard.middleware");

function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(methodGuardMiddleware);
  app.use(express.json());
  app.use(routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp,
};
