module.exports = (api) => {
  const defaultPlugins = [
    ['@babel/plugin-transform-runtime'],
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }]
  ];
  api.cache(false);
  return {
        plugins: [
          ...defaultPlugins
        ],
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              targets: {
                chrome: '63'
              },
              useBuiltIns: 'usage',
              corejs: { version: 3, proposals: true }
            }
          ],
          '@babel/preset-react',
          '@babel/preset-typescript'
        ]
      };
};
