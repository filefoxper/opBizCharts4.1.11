/**
 *  webpack 基础配置
 */

const pathBuilder = require('path');
// webpack 压缩插件
const TerserPlugin = require('terser-webpack-plugin');
// ts 配置文件读取插件
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const webpack = require('webpack');

module.exports = function (env, mode) {
  const { output = './dist' } = env;
  const outputParts = output.split('/');
  return {
    mode,
    devtool: mode !== 'production' ? 'source-map' : undefined,
    cache: true,
    output: {
      path: pathBuilder.resolve(...outputParts),
      filename: '[name].[chunkhash].js'
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'commons',
            reuseExistingChunk: true,
            chunks: 'all'
          }
        }
      }
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json', 'txt'],
      // 路径简化识别插件
      plugins: [
        // typescript 路径识别插件，该插件会通过 tsconfig 配置生成简化的别名
        // 如 tsconfig 中 paths:{"@/*": ["src/*"]}
        // 通过该插件，代码中可使用 import {...} from '@/components/....' 这种形式。
        // 这种形式代表了 import {...} from '${root}/src/components/....'
        new TsconfigPathsPlugin({ configFile: './tsconfig.json' })
      ]
    },
    // 模块系统配置
    module: {
      // 文件编译规则
      rules: [
        {
          // 匹配文件名
          test: /\.ts$|\.tsx$/,
          // 排除匹配目录
          exclude: /(node_modules|bower_components)/,
          // 使用编译接驳器 babel-loader，
          // babel-loader 会自动寻找 .babelrc，babel.config.js等文件，将配置信息merge成 babel 解析配置信息
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
          // less处理
          test: /\.less$/,
          exclude: /(node_modules|bower_components)/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]_[local]_[hash:base64:5]'
                }
              }
            },
            {
              loader: 'less-loader'
            }
          ]
        }
      ]
    },
    plugins: [
      // 定义环境变量，环境变量可在代码中使用，webpack会根据环境变量忽略不符合当前编译环境的代码
      new webpack.DefinePlugin({
        'process.env':{
          NODE_ENV: JSON.stringify(mode === 'development' ? mode : 'production')
        }
      })
    ]
  };
};
