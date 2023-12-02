process.env.TZ = 'UTC' // normalize timezone for tests

module.exports = {
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
  testEnvironment: 'jsdom'
}
