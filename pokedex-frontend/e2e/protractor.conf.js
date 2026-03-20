// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

'use strict';

const path = require('path');
const tsNode = require('ts-node');
const { SpecReporter, StacktraceOption } = require('jasmine-spec-reporter');

/**
 * @type { import("protractor").Config }
 */
const config = {
  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],
  capabilities: {
    browserName: 'chrome'
  },
  directConnect: true,
  SELENIUM_PROMISE_MANAGER: false,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: () => {}
  },

  onPrepare: async function onPrepare() {
    try {
      tsNode.register({
        project: path.join(__dirname, './tsconfig.json')
      });

      const reporter = new SpecReporter({
        spec: {
          displayStacktrace: StacktraceOption.PRETTY
        }
      });

      jasmine.getEnv().addReporter(reporter);
    } catch (error) {
      // Log and rethrow so the test runner receives the original failure behavior
      // (preserves current behavior while providing clearer diagnostics).
      // eslint-disable-next-line no-console
      console.error('Error during Protractor onPrepare:', error);
      throw error;
    }
  }
};

module.exports = config;
