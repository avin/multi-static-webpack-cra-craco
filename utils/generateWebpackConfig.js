import { createWebpackDevConfig, createWebpackProdConfig } from "@craco/craco";

const cracoConfig = {
  eslint: {
    enable: false,
  },
  webpack: {
    plugins: {
      remove: ["HtmlWebpackPlugin", "WebpackManifestPlugin"],
    },
    configure: (webpackConfig, { env, paths }) => {
      return webpackConfig;
    },
  },
};

function generateWebpackConfig({
  filename,
  path,
  publicPath,
  src = "",
  mode = "development",
}) {
  const config =
    mode === "development"
      ? createWebpackDevConfig(cracoConfig)
      : createWebpackProdConfig(cracoConfig);
  config.entry = {
    app: src,
  };
  config.output = {
    filename,
    path,
    publicPath,
  };

  if(mode === "development"){
    const svgRule = config.module.rules[1].oneOf.find(
        (i) => String(i.test) === String(/\.svg$/)
    );
    svgRule.use = svgRule.use.filter((i) => !i.loader.includes("file-loader"));
    svgRule.use.push({
      loader: "url-loader",
    });
  }

  return config;
}

export default generateWebpackConfig;
