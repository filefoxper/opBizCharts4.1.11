/**
 * 项目包大小及组成分析环境
 */

// webpack 包大小及组成分析插件
const BundleAnalyzerPlugin =
    require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// 依赖生产环境配置
const generateBuildConfig = require('./webpack.op.build.js');

module.exports = function (env) {
    const config = generateBuildConfig(env);
    return {
        ...config,
        plugins: config.plugins.concat([
            // 添加包大小及组成分析插件
            new BundleAnalyzerPlugin()
        ])
    };
};
