/**
 * 开发环境 webpack 配置
 */
const pathBuilder = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 建立在基础配置基础上
const generateBaseConfig = require('./webpack.base.js');
const antvSelect = require('./plugins/antv-selector.js');

// 开发环境 html 模版
const templateHtmlPath = pathBuilder.resolve('template.index.html');

// 开发环境配置入口
module.exports = function (env) {
  const { output = './dist' } = env;
  const config = generateBaseConfig(env, 'development');
  const outputParts = output.split('/');
  const targetPath = pathBuilder.resolve(...outputParts);
  const antv = antvSelect(__dirname);
  return {
    ...config,
    entry: {
      bundle: pathBuilder.resolve('src', 'index.tsx')
    },
    externals: {},
    resolve: {
      ...config.resolve,
      // 使用 bizcharts/es 以及 @antv/${xxx}/esm 进行打包体积优化
      // 通过别名系统修正 bizcharts 引入@antv混乱问题，统一修正为引用 @antv/${xxx}/esm
      alias: {
        ...antv,
        'bizcharts':'bizcharts/es'
      }
    },
    module: {
      rules: config.module.rules.concat([
        // 通过 include 指定需要优化编译的包 bizcharts 和 @antv
        {
          test: /\.js$/,
          include:
              /(node_modules\/bizcharts\/es\/index.js)/,
          sideEffects: false,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true
              }
            }
          ]
        },
        {
          test: /\.js$/,
          include:
              /(node_modules\/bizcharts\/es)/,
          exclude: /(node_modules\/bizcharts\/es\/index.js)/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true
              }
            }
          ]
        }
      ])
    },
    optimization: {
      // 开发环境舍弃 minimize 和 minimizer 压缩配置，以达到编译速度提升的效果
      splitChunks: config.optimization.splitChunks
    },
    // 使用开发环境 html 模版
    plugins: config.plugins.concat([
      new HtmlWebpackPlugin({
        plugin: 'html',
        filename: pathBuilder.resolve(...outputParts, 'index.html'),
        template: templateHtmlPath,
        inject: true
      })
    ]),
    // 配置开发虚拟服务
    devServer: {
      // 刷新时，让当前域名下的url访问 index.html
      historyApiFallback: true,
      // 热编译
      hot: true,
      // 不检查访问机器IP，即允许其他机器访问开发虚拟服务
      disableHostCheck: true,
      // 服务器主目录配置
      contentBase: targetPath,
      // 虚拟服务器IP
      host: 'localhost',
      serveIndex: false,
      // 虚拟服务器端口
      port: 8080
    }
  };
};
