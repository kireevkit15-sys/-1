#!/usr/bin/env node
/**
 * E2E test runner with increased stack size for Node 24+.
 * Usage: node --stack-size=65536 test/run-e2e.js [test-file-pattern]
 *
 * Runs Jest in-band (same process) to inherit the stack size setting.
 */
const { runCLI } = require('jest');
const path = require('path');

const testPattern = process.argv[2] || '';

runCLI(
  {
    config: path.resolve(__dirname, 'jest-e2e.json'),
    coverage: false,
    forceExit: true,
    runInBand: true,
    testPathPattern: testPattern,
    verbose: true,
  },
  [path.resolve(__dirname, '..')],
).then(({ results }) => {
  process.exit(results.success ? 0 : 1);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
