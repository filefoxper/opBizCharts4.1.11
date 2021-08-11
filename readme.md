# 针对 webpack 引入 bizcharts 包过大问题的优化

bizcharts 正在被当作 highchart 的 react 图表替代库被许多玩家使用起来，但目前还有一些问题，比如对 react 版本的支持落后问题，支持方式不规范问题等。但目前首要解决的是编译后包大小的问题。如果没有任何优化，bizcharts+@antv 的包可以达到 1.56 MB。这里给出一些打包优化建议，使用 webpack 和 babel 的同学可以作个参考。

## 原理

使用 webpack module 的 rules 建立一个强行编译待优化库的 rule ，如果该库含有 es/esm 等模块化包，可以通过 webpack resolve 的 alias 别名功能，把引用别名修改至 es/esm 包，这样 webpack 可以在编译时的 tree shaking 就能把没用到的模块去掉了，如：

```javascript
import { Chart, LineAdvance} from 'bizcharts';
```

在 alias 中设置 

```javascript
{
    resolve:{
        alias:{
            'bizcharts':'bizcharts/es'
        }
    }
}

```

webpack 编译时变成

```javascript
import { Chart, LineAdvance} from 'bizcharts/es';
```

es 包中的模块就跟我们开发的模块差不多，一旦被编译进来，很容易被 webpack 自动去掉没被引用到的部分。我们可以通过在 module 里加 rule 很容易做到这点。

```javascript
{
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
        }
}
```

<strong>注意：这里只是说明原理，并非完整的优化，相当于下述的第一步分析。</strong>

## 一、分析

首先可以通过上述原理直接配置优化 `bizcharts` 包，然后使用 `webpack-bundle-analyzer` plugin 进行观察。通过观察可以发现 `bizcharts` 引入了 `@antv`，而且引用得比较混乱，有从 `@antv/xxx/lib` 中引用的，也有从 `@antv/xxx/esm` 中引用的。这时候，我们可以发现，体积该方案已经有成效了，只是成效比较低，只优化了几 kb 。

那么接下来我们就要针对 `bizcharts` 引用 `@antv` 混乱的情况入手了。

该步骤配置可参考 [webpack.biz.analyze.js](/webpack.biz.analyze.js)

运行命令看效果：

优化前：

```
npm run analyze
```

![before](/analyze/no_op.png)

只优化 bizcharts：

```
npm run biz-analyze
```

![after](/analyze/only_bizcharts.png)

## 二、针对引用继续优化

处理 `bizcharts` 引用混乱的问题很简单粗暴，那就是我们既编译 `bizcharts` 又编译 `@antv`，并且在编译的过程中让 webpack 认为 `bizcharts` 的所有关于 `@antv` 的引用都是引用自 `@antv/xxx/esm` 包的。关于这两点通过采用类似上述的手法，依然很容易完成。

通过 alias 把 `@antv/xxx/lib` 映射成 `@antv/xxx/esm`，为了完成这一步，我们可以通过人肉观察 node_modules 中被带入的 `@antv` 的内部结构，把它的目录一一配置进 alias ，也可以通过脚步自动组合出他的别名引用表。

```javascript
const fs = require('fs');
const path = require('path');

module.exports = function select(rootPath) {
    const dirPath = path.resolve(rootPath,'node_modules','@antv');
    // 读取 @antv 子目录
    const subs = fs.readdirSync(dirPath);
    // 生成一个 lib 目录名为 key ， esm 目录名为 value 的 object
    return subs.reduce((r,sub)=>{
        const source =`@antv/${sub}/lib`;
        const target = `@antv/${sub}/esm`;
        return {...r,[source]:target};
    },{});
}
```

让我们把上面的工具用起来，并把生成好的 @antv 引用别名添加到 alias

```javascript
const antvSelect = require('./plugins/antv-selector.js');
const antv = antvSelect(__dirname);

{
    resolve: {
            ...config.resolve,
            // 使用 bizcharts/es 以及 @antv/${xxx}/esm 进行打包体积优化
            // 通过别名系统修正 bizcharts 引入@antv混乱问题，
            // 统一修正为引用 @antv/${xxx}/esm
            alias: {
                ...antv,
                'bizcharts':'bizcharts/es'
            }
        },
}
```

然后同时强行编译 `bizcharts` 和 `@antv`：

```javascript
{
    module: {
        rules: config.module.rules.concat([
            // 通过 include 指定需要优化编译的包 bizcharts 和 @antv
            {
                test: /\.js$/,
                include:
                    /(node_modules\/bizcharts\/es|node_modules\/@antv)/,
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
}
```

该步骤配置可参考 [webpack.op.build.js](/webpack.op.build.js)

运行命令看效果：

优化前：

```
npm run analyze
```

![before](/analyze/no_op.png)

只优化 bizcharts：

```
npm run biz-analyze
```

![after](/analyze/only_bizcharts.png)

全量优化：

```
npm run op-analyze
```

![final](/analyze/oped.png)

可以看到，这时候包体积大约减少了 600 kb 左右。

## 亲手试试

1. 下载项目
2. 进入项目主目录
3. 运行 npm install

#### 开始运行

```
npm start
```

访问 `localhost:8080`

#### 优化前分析

```
npm run analyze
```

#### 只优化 bizcharts 分析

```
npm run biz-analyze
```

#### 全量优化分析

```
npm run op-analyze
```

最终优化配置可以关注 [webpack.op.build.js](/webpack.op.build.js)

## 最后

希望对大家的编译优化有一定的帮助，谢谢大家。

