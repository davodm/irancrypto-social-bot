import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { setupTestEnv } from './helpers.js';

describe("AI Helper", () => {
  let restoreEnv;

  beforeEach(() => {
    // Setup test environment
    restoreEnv = setupTestEnv({ 
      NODE_ENV: 'test',
      OPENAI_MODEL: 'gpt-4',
      OPENROUTER_API_KEY: 'test-key'
    });
  });

  test("environment variables should be set correctly", () => {
    assert.strictEqual(process.env.NODE_ENV, 'test');
    assert.strictEqual(process.env.OPENAI_MODEL, 'gpt-4');
    assert.strictEqual(process.env.OPENROUTER_API_KEY, 'test-key');
  });

  test("should have proper test environment setup", () => {
    assert.strictEqual(typeof restoreEnv, 'function');
    assert.strictEqual(process.env.NODE_ENV, 'test');
  });

  test("should be able to call restore function", () => {
    // Just test that the restore function exists and is callable
    assert.strictEqual(typeof restoreEnv, 'function');
    
    // Call it to make sure it doesn't throw
    assert.doesNotThrow(() => {
      restoreEnv();
    });
  });
});
