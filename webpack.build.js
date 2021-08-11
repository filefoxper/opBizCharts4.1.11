/**
 * 生产环境 webpack 配置
 */
const pathBuilder = require('path');
// html 模版编译插件
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 基本 webpack 配置
const generateBaseConfig = require('./webpack.base.js');

// 编译生产环境使用的html模版
const buildTemplateHtmlPath = pathBuilder.resolve('template.index.html');

module.exports = function (env) {
  const { output: out = '.' } = env;
  const outputParts = out.split('/');
  const config = generateBaseConfig(env, 'production');
  return {
    ...config,
    entry: {
      bundle: pathBuilder.resolve('src', 'index.tsx')
    },
    plugins: config.plugins.concat([
      new HtmlWebpackPlugin({
        plugin: 'html',
        filename: pathBuilder.resolve(...outputParts, 'index.html'),
        template: buildTemplateHtmlPath,
        inject: true
      })
    ])
  };
};
