import { defineConfig, makeTest, defaultFileReader } from "multi-static";
import localhostCerts from "localhost-certs";
import fs from "fs-extra";
import path from "path";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpack from "webpack";
import generateWebpackConfig from "./utils/generateWebpackConfig";

const _webpackMiddlewaresCache = {};

const config = defineConfig({
  mapping: [["./src", "/root"]],

  http: {
    ...localhostCerts(),
  },

  transformers: [
    // ------------
    // *.JS Webpack
    // ------------
    {
      beforeTest: ({ file, mode }) => {
        file.servePath = file.servePath.replace(/\.ts$/, ".js");
        file.srcPath = file.srcPath.replace(/\.js$/, ".ts");
      },
      test: makeTest({
        check: ({ file }) => file.srcPath.endsWith(".ts"),
        checkFirstLine: (firstLine) => firstLine.startsWith("// @process"),
      }),
      processors: [],
      sendResponse: ({ file, req, res, next }) => {
        let cachedWebpackMiddleware = _webpackMiddlewaresCache[file.srcPath];

        if (!cachedWebpackMiddleware) {
          const servePathArr = file.servePath.split("/");
          const reqFileName = servePathArr.slice(-1)[0];
          const reqFolder = servePathArr.slice(0, -1).join("/");

          const config = generateWebpackConfig({
            mode: "development",
            src: file.srcPath,
            filename: reqFileName,
            publicPath: reqFolder,
          });

          cachedWebpackMiddleware = webpackDevMiddleware(webpack(config), {
            publicPath: config.output.publicPath,
            stats: "errors-only",
          });
          _webpackMiddlewaresCache[file.srcPath] = cachedWebpackMiddleware;
        }

        cachedWebpackMiddleware(req, res, next);
      },
      writeContent: async ({ file, buildPath }) => {
        const dstArr = file.servePath.split("/");
        const dstFileName = dstArr.slice(-1)[0];
        const dstFolder = dstArr.slice(0, -1).join("/");

        const config = generateWebpackConfig({
          mode: "production",
          src: file.srcPath,

          filename: dstFileName,
          path: path.join(buildPath, dstFolder),
          publicPath: "",
        });

        await new Promise((resolve, reject) => {
          webpack(config, (err, stats) => {
            if (!stats) {
              return reject();
            }
            const errorsText = stats.toString({ all: false, errors: true });
            if (errorsText) {
              console.log(errorsText);
            }

            if (err) {
              return reject();
            }
            resolve();
          });
        });
      },
    },
  ],

  onBeforeBuild({ config }) {
    console.info(`+ removing ${config.buildPath}`);
    fs.removeSync(this.buildPath);
  },
});

export default config;
