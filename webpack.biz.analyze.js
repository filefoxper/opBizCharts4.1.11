/**
 * 项目包大小及组成分析环境
 */

// webpack 包大小及组成分析插件
const BundleAnalyzerPlugin =
    require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// 依赖生产环境配置
const generateBuildConfig = require('./webpack.build.js');

module.exports = function (env) {
    const config = generateBuildConfig(env);
    return {
        ...config,
        resolve: {
            ...config.resolve,
            // 直接通过编译 bizcharts/es 进行打包体积优化
            alias: {
                'bizcharts':'bizcharts/es'
            }
        },
        module: {
            rules: config.module.rules.concat([
                // 通过 include 指定需要优化编译的包 bizcharts
                {
                    test: /\.js$/,
                    include:
                        /(node_modules\/bizcharts\/es)/,
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
            // 添加包大小及组成分析插件
            new BundleAnalyzerPlugin()
        ])
    };
};
