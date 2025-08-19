#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const testConfig = {
  timeout: 30000, // 30 seconds timeout
  watch: process.argv.includes('--watch'),
  coverage: process.argv.includes('--coverage')
};

// Build test command
let testCommand = 'node';
let testArgs = ['--test'];

if (testConfig.watch) {
  testArgs.push('--watch');
}

if (testConfig.coverage) {
  testCommand = 'c8';
  testArgs = ['node', '--test'];
}

// Add timeout
testArgs.push('--test-timeout', testConfig.timeout.toString());

// Add test directory - use glob pattern for all test files
testArgs.push(join(__dirname, '*.js'));

console.log(`🚀 Running tests with: ${testCommand} ${testArgs.join(' ')}`);
console.log(`⏱️  Timeout: ${testConfig.timeout}ms`);
console.log(`📁 Test directory: ${__dirname}`);
console.log('');

// Run tests
const testProcess = spawn(testCommand, testArgs, {
  stdio: 'inherit',
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error.message);
  process.exit(1);
});
