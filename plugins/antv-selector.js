const fs = require('fs');
const path = require('path');

module.exports = function select(rootPath) {
    const dirPath = path.resolve(rootPath,'node_modules','@antv');
    const subs = fs.readdirSync(dirPath);
    return subs.reduce((r,sub)=>{
        const source =`@antv/${sub}/lib`;
        const target = `@antv/${sub}/esm`;
        return {...r,[source]:target};
    },{});
}