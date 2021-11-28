/**
 * 生产环境 webpack 配置
 */
const pathBuilder = require('path');
// html 模版编译插件
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 基本 webpack 配置
const generateBaseConfig = require('./webpack.base.js');
const antvSelect = require('./plugins/antv-selector.js');

// 编译生产环境使用的html模版
const buildTemplateHtmlPath = pathBuilder.resolve('template.index.html');

module.exports = function (env) {
    const { output: out = '.' } = env;
    const outputParts = out.split('/');
    const config = generateBaseConfig(env, 'production');
    const antv = antvSelect(__dirname);
    return {
        ...config,
        entry: {
            bundle: pathBuilder.resolve('src', 'index.tsx')
        },
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
                // 通过 include 指定需要欺骗 webpack 为无副作用的 bizcharts/es/index.js
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
                // 通过 include 指定除去 index.js 外需要优化编译的 bizcharts 项
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
