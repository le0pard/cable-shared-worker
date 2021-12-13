const browserlist = require('./browserslist.config')

module.exports = (api) => {
  const validEnv = ['development', 'test', 'production']
  const currentEnv = api.env()
  const isTestEnv = api.env('test')

  if (!validEnv.includes(currentEnv)) {
    throw new Error(
      'Please specify a valid `NODE_ENV` or ' +
        '`BABEL_ENV` environment variables. Valid values are "development", ' +
        '"test", and "production". Instead, received: ' +
        JSON.stringify(currentEnv) +
        '.'
    )
  }

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: browserlist,
          modules: isTestEnv ? 'auto' : false,
          useBuiltIns: 'usage',
          corejs: 3,
          exclude: ['transform-typeof-symbol']
        }
      ]
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          helpers: false
        }
      ]
    ].filter(Boolean)
  }
}
