'use strict';

/**
 * Karma configuration factory
 * @param {Object} config - Karma configuration object provided by Karma runner
 */
module.exports = function (config) {
  if (!config || typeof config.set !== 'function') {
    throw new TypeError('Expected a Karma config object with a set(config) method.');
  }

  const path = require('path');

  // Constants for readability and easy modification
  const PORT = 9876;
  const BROWSERS = ['Chrome'];
  const FRAMEWORKS = ['jasmine', '@angular-devkit/build-angular'];
  const PLUGINS = [
    require('karma-jasmine'),
    require('karma-chrome-launcher'),
    require('karma-jasmine-html-reporter'),
    require('karma-coverage'),
    require('@angular-devkit/build-angular/plugins/karma')
  ];

  const coverageOutputDir = path.join(__dirname, './coverage/pokedex-frontend');
  const COVERAGE_REPORTERS = [{ type: 'html' }, { type: 'text-summary' }];

  config.set({
    basePath: '',
    frameworks: FRAMEWORKS,
    plugins: PLUGINS,
    client: {
      jasmine: {
        // Add Jasmine configuration here if needed
        // See: https://jasmine.github.io/api/edge/Configuration.html
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: coverageOutputDir,
      subdir: '.',
      reporters: COVERAGE_REPORTERS
    },
    reporters: ['progress', 'kjhtml'],
    port: PORT,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: BROWSERS,
    singleRun: false,
    restartOnFileChange: true
  });
};
