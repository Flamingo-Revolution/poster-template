const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL: 'http://127.0.0.1:8085',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'node scripts/serve.js',
    url: 'http://127.0.0.1:8085/flamingo-times-template-v2.html',
    reuseExistingServer: true,
    timeout: 15000
  }
});
