# 针对 webpack 引入 bizcharts 包过大问题的优化

bizcharts 作为当下比较流行的免费 react 图表库获得了众多使用者的追捧，但目前还有一些问题，比如对 react 版本的支持落后问题，支持方式不规范问题等。但目前首要解决的是编译后包大小的问题。如果没有任何优化，bizcharts+@antv 的包可以达到 1.56 MB。这里给出一些打包优化建议，使用 webpack 和 babel 的同学可以作个参考。本例使用的是 webpack5，如果 webpack 版本低于 4，效果可能会略有差异。

如果觉得有帮助，请别吝啬你的小星星哦。

## 原理

使用 webpack module 的 rules 建立一个强行编译待优化库的 rule ，如果该库含有 es/esm 等模块化包，可以通过 webpack resolve 的 alias 别名功能，把引用映射至 es/esm 包，这样 webpack + babel 可以在编译时按我们浏览器需求进行 polyfill 优化了（准确说是 babel 的优化），如：

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

es 包中的模块就跟我们开发的模块差不多，一旦被编译进来，就可以按我们的浏览器支持需求，重新生成 polyfill 了。

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

首先可以通过上述原理直接配置优化 `bizcharts` 包，然后使用 `webpack-bundle-analyzer` plugin 进行观察。通过观察可以发现 `bizcharts` 引入了 `@antv`，而且引用得比较混乱，有从 `@antv/xxx/lib` 中引用的，也有从 `@antv/xxx/esm` 中引用的。这时候，我们可以发现，体积优化策略已经初具成效，只是成效比较低，只优化了几 kb 。

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

那么接下来我们就要针对 `bizcharts` 引用 `@antv` 混乱的情况下手了。

## 二、针对引用继续优化

处理 `bizcharts` 引用混乱的问题很简单粗暴，那就是我们在编译 `bizcharts` 时修改关于 `@antv` 的引用，这里我们再次通过 alias 让 webpack 认为 `bizcharts` 的所有关于 `@antv` 的引用都是引用自 `@antv/xxx/esm` 包的。

通过 alias 把 `@antv/xxx/lib` 映射成 `@antv/xxx/esm`，为了完成这一步，我们可以通过人肉观察 node_modules 中被带入的 `@antv` 的内部结构，把它的目录一一配置进 alias ，也可以通过脚本自动组合出他的别名引用表，assign 进 alias 配置。

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

让我们把上面的工具用起来，并把生成好的 @antv 引用别名添加到 alias 映射对象中去

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

然后同时强行编译 `bizcharts`：

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

![final](/analyze/oped2.png)

可以看到，这时候包体积大约减少了 600 kb 左右。

也许有些使用者会觉得还是官方提供的按需加载方案更好，优化后的包也要小得多，但官方的按需加载还有两个不易解决的梗：

1. 需要定位相关组件的包位置，如：`import Chart from 'bizcharts/es/components/Chart'`，这种引用方式对希望使用 `import {Chart} from 'bizcharts'` 的使用者来说就是个噩梦。
2. 原先的配置项需要自己重新引包进一步支持，否则效果会与官方默认用法不一致。

以上两点的 2 点，我表示爱莫能助，但如果想解决第 1 个难题：“想用 `import {Chart} from 'bizcharts'` 的方式按需加载，并配合当前的方案进一步优化大小”，那么请往下看。

## 按需加载 + 编译双优化

官网的按需加载，其实就是绕过 index.js ，而激活了 webpack 的 `tree-shaking` 功能，把不需要的引用给摇掉了。

这里我们介绍一下，为什么我们前面的强编译没有 `tree-shaking` 效果。webpack 5 的 `tree-shaking` 功能必须满足没有副作用才能成功，如果 webpack 自行判断当前模块有副作用，那就不对其使用 `tree-shaking`，而 `bizcharts` 的 index.js 中的副作用就是用来做自适应配置工作的，所以 webpack 无法自行对其进行摇树。

为了达到按需加载的功能，我们需要让 webpack 摇起来（一起摇摆，一起摇摆）。好消息是 webpack 5 提供了一个 `optimization.usedExports` 配置，通过这个配置与 rules 中的 `sideEffects` 配合就可以做到人工强制 `tree-shaking` 了。

因为弄清楚了官方按需加载的原理其实就是绕过了 index.js 文件。所以，我们只要欺骗 webpack，这个文件没有副作用就可以达成我们的目的了。配置修改如下：

webpack.base.js

```javascript
...,
optimization: {
    usedExports: true,
    ...
},
...
```

webpack.op2.build.js

```javascript
...,
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
...
```

通过以上配置优化，我们能让

```javascript
import {Chart} from 'bizcharts';
```

等效于

```javascript
import Chart from 'bizcharts/es/components/Chart';
```

看效果:

![more](/analyze/oped3.png)

我们又优化了近 400 kb。当然之后的配置组件还是要自己补全的，所以是否要使用最后一种编译期按需加载优化方式还需要使用者自己权衡。

为啥不把整个 `bizcharts` 包标记为无副作用？因为官方的优化方案只是提示了 index.js 可以做无副作用欺诈，并不代表内部其他文件都可以这么做。事实上我也试过对全包进行标记，但结局就像我预料的一样，编译失败了。

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

#### 编译期按需加载优化

```
npm run op2-analyze
```

最终优化配置可以关注 [webpack.op.build.js](/webpack.op.build.js) 和 [webpack.op2.build.js](/webpack.op2.build.js)

## 最后

希望对大家的编译优化有一定的帮助，谢谢大家参阅，也希望大家可以提出更好的建议，同时希望 bizcharts 库作者可以及时做出修改，让这个库更好用。如果觉得有帮助，请别吝啬你的小星星哦。

## 修订

* 因为引用问题出在 `bizcharts` 中，所以我们不需要再编译 `@antv` 包，只要帮 `bizcharts` 指定好，关于 `@antv` 的包即可。
* 添加了 `bizcharts` 按需加载的编译期处理方案。

